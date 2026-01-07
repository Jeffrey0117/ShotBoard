import React, { useState, useCallback } from 'react';
import { useScreenRecorder } from './useScreenRecorder';
import { SourcePicker, RecordingSource } from './SourcePicker';
import { CameraBubble } from '../Recorder/CameraBubble';
import './ScreenRecorder.css';

interface ScreenRecorderProps {
  onRecordingComplete?: (blob: Blob) => void;
}

export const ScreenRecorder: React.FC<ScreenRecorderProps> = ({
  onRecordingComplete,
}) => {
  const [showSourcePicker, setShowSourcePicker] = useState(false);

  const {
    isRecording,
    isPaused,
    isPreviewing,
    duration,
    selectedSource,
    config,
    cameraStream,
    setSource,
    startPreview,
    stopPreview,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    setAudioSettings,
    updateBubbleConfig,
  } = useScreenRecorder();

  // 格式化時間
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // 選擇錄製來源
  const handleSourceSelect = useCallback(
    async (source: RecordingSource) => {
      setSource(source);
      setShowSourcePicker(false);

      // 自動開始預覽
      try {
        await startPreview();
      } catch (error) {
        console.error('Failed to start preview:', error);
        alert('無法開始預覽，請檢查權限設定。');
      }
    },
    [setSource, startPreview]
  );

  // 開始錄製
  const handleStartRecording = useCallback(async () => {
    try {
      await startRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('無法開始錄製。');
    }
  }, [startRecording]);

  // 停止錄製
  const handleStopRecording = useCallback(async () => {
    try {
      const blob = await stopRecording();

      if (onRecordingComplete) {
        onRecordingComplete(blob);
      } else {
        // 預設：下載檔案
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `screen-recording-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  }, [stopRecording, onRecordingComplete]);

  return (
    <div className="screen-recorder">
      {/* 錄製控制面板 */}
      <div className="screen-recorder-panel">
        <div className="panel-header">
          <h3>螢幕錄影</h3>
        </div>

        <div className="panel-content">
          {/* 來源選擇 */}
          <div className="source-section">
            <label>錄製來源</label>
            <button
              className="source-select-button"
              onClick={() => setShowSourcePicker(true)}
              disabled={isRecording}
            >
              {selectedSource ? (
                <>
                  <span className="source-type-icon">
                    {selectedSource.type === 'screen'
                      ? '🖥️'
                      : selectedSource.type === 'window'
                      ? '🪟'
                      : '⬚'}
                  </span>
                  <span className="source-name">{selectedSource.name}</span>
                </>
              ) : (
                '選擇螢幕/視窗...'
              )}
            </button>
          </div>

          {/* 音訊設定 */}
          <div className="audio-section">
            <label>音訊設定</label>
            <div className="audio-options">
              <label className="audio-checkbox">
                <input
                  type="checkbox"
                  checked={config.audio.microphone}
                  onChange={(e) =>
                    setAudioSettings({ microphone: e.target.checked })
                  }
                  disabled={isRecording}
                />
                <span>🎤 麥克風</span>
              </label>
              <label className="audio-checkbox">
                <input
                  type="checkbox"
                  checked={config.audio.systemAudio}
                  onChange={(e) =>
                    setAudioSettings({ systemAudio: e.target.checked })
                  }
                  disabled={isRecording}
                />
                <span>🔊 系統音訊</span>
              </label>
            </div>

            {/* 音量控制 */}
            {config.audio.microphone && (
              <div className="volume-control">
                <span>🎤</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={config.audio.microphoneVolume}
                  onChange={(e) =>
                    setAudioSettings({ microphoneVolume: parseFloat(e.target.value) })
                  }
                />
              </div>
            )}
            {config.audio.systemAudio && (
              <div className="volume-control">
                <span>🔊</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={config.audio.systemAudioVolume}
                  onChange={(e) =>
                    setAudioSettings({
                      systemAudioVolume: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
            )}
          </div>

          {/* 錄製狀態 */}
          {isRecording && (
            <div className="recording-status">
              <span className="recording-indicator" />
              <span className="recording-time">{formatDuration(duration)}</span>
            </div>
          )}

          {/* 控制按鈕 */}
          <div className="control-buttons">
            {!isPreviewing && !isRecording && (
              <button
                className="control-button preview"
                onClick={() => setShowSourcePicker(true)}
                disabled={!selectedSource}
              >
                選擇來源並預覽
              </button>
            )}

            {isPreviewing && !isRecording && (
              <>
                <button
                  className="control-button start"
                  onClick={handleStartRecording}
                >
                  ⏺️ 開始錄製
                </button>
                <button className="control-button stop" onClick={stopPreview}>
                  取消
                </button>
              </>
            )}

            {isRecording && (
              <>
                {isPaused ? (
                  <button
                    className="control-button resume"
                    onClick={resumeRecording}
                  >
                    ▶️ 繼續
                  </button>
                ) : (
                  <button
                    className="control-button pause"
                    onClick={pauseRecording}
                  >
                    ⏸️ 暫停
                  </button>
                )}
                <button
                  className="control-button stop"
                  onClick={handleStopRecording}
                >
                  ⏹️ 停止
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 來源選擇器 Modal */}
      <SourcePicker
        isOpen={showSourcePicker}
        onClose={() => setShowSourcePicker(false)}
        onSelect={handleSourceSelect}
      />

      {/* 攝像頭泡泡 */}
      {isPreviewing && config.overlay.camera && (
        <CameraBubble
          stream={cameraStream}
          onBubbleConfigChange={updateBubbleConfig}
          settings={{
            visible: true,
            shape: 'circle',
            borderRadius: 16,
          }}
          onSettingsChange={() => {}}
        />
      )}
    </div>
  );
};

export { SourcePicker } from './SourcePicker';
export { useScreenRecorder } from './useScreenRecorder';
export type { RecordingSource } from './SourcePicker';
