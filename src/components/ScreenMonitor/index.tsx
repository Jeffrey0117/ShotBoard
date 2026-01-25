import { useEffect, useRef, useCallback, useState } from 'react';
import { useMonitorStore, CapturedFrame } from '../../stores/monitorStore';
import { compareImages, generateId, formatTime, addTimestampToImage } from './utils';
import './styles.css';

interface ScreenMonitorProps {
  onClose: () => void;
}

export function ScreenMonitor({ onClose }: ScreenMonitorProps) {
  const {
    isMonitoring,
    frames,
    settings,
    startMonitoring,
    stopMonitoring,
    addFrame,
    clearFrames,
    updateSettings,
    lastFrameDataUrl,
    setLastFrame,
    startTime,
  } = useMonitorStore();

  const intervalRef = useRef<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  // const [selectedFrames, setSelectedFrames] = useState<Set<string>>(new Set());

  // 截圖並比對
  const captureAndCompare = useCallback(async () => {
    try {
      const dataUrl = await window.electronAPI?.captureScreen();
      if (!dataUrl) return;

      let finalDataUrl = dataUrl;

      // 加時間戳浮水印
      if (settings.addTimestamp) {
        finalDataUrl = await addTimestampToImage(dataUrl);
      }

      // 比對變化
      let changePercent = 100;
      if (lastFrameDataUrl) {
        changePercent = await compareImages(lastFrameDataUrl, dataUrl);
      }

      // 只有變化超過閾值才保存
      if (changePercent >= settings.changeThreshold) {
        const frame: CapturedFrame = {
          id: generateId(),
          dataUrl: finalDataUrl,
          timestamp: Date.now(),
          changePercent,
        };
        addFrame(frame);
      } else {
        // 更新最後一幀用於比對，但不保存
        setLastFrame(dataUrl);
      }
    } catch (error) {
      console.error('Screenshot capture failed:', error);
    }
  }, [lastFrameDataUrl, settings, addFrame, setLastFrame]);

  // 開始/停止監控
  const handleToggleMonitoring = useCallback(() => {
    if (isMonitoring) {
      stopMonitoring();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } else {
      startMonitoring();
      // 立即截一張
      captureAndCompare();
      // 設定定時器
      intervalRef.current = window.setInterval(captureAndCompare, settings.interval * 1000);
    }
  }, [isMonitoring, settings.interval, startMonitoring, stopMonitoring, captureAndCompare]);

  // 清理定時器
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // 設定變更時重新設定定時器
  useEffect(() => {
    if (isMonitoring && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = window.setInterval(captureAndCompare, settings.interval * 1000);
    }
  }, [settings.interval, isMonitoring, captureAndCompare]);

  // 匯出為圖片 ZIP
  const handleExportImages = useCallback(async () => {
    if (frames.length === 0) return;

    setIsExporting(true);
    setExportProgress(0);

    try {
      // 逐張下載（簡單方案）
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const a = document.createElement('a');
        a.href = frame.dataUrl;
        a.download = `frame-${String(i + 1).padStart(4, '0')}-${new Date(frame.timestamp).toISOString().replace(/[:.]/g, '-')}.png`;
        a.click();
        setExportProgress(Math.round(((i + 1) / frames.length) * 100));
        // 小延遲避免瀏覽器阻擋
        await new Promise((r) => setTimeout(r, 100));
      }
      setIsExporting(false);
      setExportProgress(0);
    } catch (error) {
      console.error('Export failed:', error);
      setIsExporting(false);
    }
  }, [frames]);

  // 匯出為影片 (WebM)
  const handleExportVideo = useCallback(async () => {
    if (frames.length === 0) return;

    setIsExporting(true);
    setExportProgress(0);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d')!;

      const stream = canvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 5000000,
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `screen-monitor-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        setIsExporting(false);
        setExportProgress(0);
      };

      mediaRecorder.start();

      // 繪製每一幀
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const img = new Image();
        await new Promise<void>((resolve) => {
          img.onload = () => {
            ctx.drawImage(img, 0, 0, 1920, 1080);
            setExportProgress(Math.round(((i + 1) / frames.length) * 100));
            // 每幀顯示 interval 秒
            setTimeout(resolve, settings.interval * 1000);
          };
          img.src = frame.dataUrl;
        });
      }

      mediaRecorder.stop();
    } catch (error) {
      console.error('Video export failed:', error);
      setIsExporting(false);
    }
  }, [frames, settings.interval]);

  // 計算運行時間
  const runningTime = isMonitoring && startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

  return (
    <div className="screen-monitor">
      <div className="screen-monitor-header">
        <h2>📷 智能螢幕監控</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="screen-monitor-content">
        {/* 控制區 */}
        <div className="monitor-controls">
          <div className="control-row">
            <button
              className={`toggle-btn ${isMonitoring ? 'recording' : ''}`}
              onClick={handleToggleMonitoring}
            >
              {isMonitoring ? '⏹ 停止監控' : '▶ 開始監控'}
            </button>

            {isMonitoring && (
              <span className="running-time">
                運行時間: {formatTime(runningTime)}
              </span>
            )}
          </div>

          <div className="settings-row">
            <label>
              截圖間隔:
              <select
                value={settings.interval}
                onChange={(e) => updateSettings({ interval: Number(e.target.value) })}
                disabled={isMonitoring}
              >
                <option value={1}>1 秒</option>
                <option value={2}>2 秒</option>
                <option value={5}>5 秒</option>
                <option value={10}>10 秒</option>
                <option value={30}>30 秒</option>
                <option value={60}>1 分鐘</option>
              </select>
            </label>

            <label>
              變化閾值:
              <select
                value={settings.changeThreshold}
                onChange={(e) => updateSettings({ changeThreshold: Number(e.target.value) })}
                disabled={isMonitoring}
              >
                <option value={1}>1% (極敏感)</option>
                <option value={3}>3%</option>
                <option value={5}>5% (建議)</option>
                <option value={10}>10%</option>
                <option value={20}>20% (低敏感)</option>
              </select>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.addTimestamp}
                onChange={(e) => updateSettings({ addTimestamp: e.target.checked })}
                disabled={isMonitoring}
              />
              時間戳浮水印
            </label>
          </div>

          <div className="action-row">
            <span className="frame-count">已捕捉: {frames.length} 幀</span>

            <button
              className="action-btn"
              onClick={clearFrames}
              disabled={isMonitoring || frames.length === 0}
            >
              🗑 清除全部
            </button>

            <button
              className="action-btn export-btn"
              onClick={handleExportImages}
              disabled={isMonitoring || frames.length === 0 || isExporting}
            >
              📦 匯出圖片
            </button>

            <button
              className="action-btn export-btn"
              onClick={handleExportVideo}
              disabled={isMonitoring || frames.length === 0 || isExporting}
            >
              🎬 匯出影片
            </button>
          </div>

          {isExporting && (
            <div className="export-progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${exportProgress}%` }} />
              </div>
              <span>{exportProgress}%</span>
            </div>
          )}
        </div>

        {/* 幀列表 */}
        <div className="frames-grid">
          {frames.length === 0 ? (
            <div className="empty-state">
              <p>尚無截圖</p>
              <p className="hint">點擊「開始監控」，畫面有變化時會自動截圖</p>
            </div>
          ) : (
            frames.map((frame, index) => (
              <div key={frame.id} className="frame-item">
                <img src={frame.dataUrl} alt={`Frame ${index + 1}`} />
                <div className="frame-info">
                  <span className="frame-time">
                    {new Date(frame.timestamp).toLocaleTimeString()}
                  </span>
                  {frame.changePercent !== undefined && (
                    <span className="frame-change">
                      變化: {frame.changePercent.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
