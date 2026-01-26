import React, { useState, useEffect } from 'react';
import './styles.css';

interface ToolbarProps {
  isPreviewing: boolean;
  isRecording: boolean;
  recordingStartTime?: number | null;
  onStartPreview: () => void;
  onStopPreview: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  isPreviewing,
  isRecording,
  recordingStartTime,
  onStartPreview,
  onStopPreview,
  onStartRecording,
  onStopRecording,
}) => {
  const [elapsed, setElapsed] = useState(0);

  // Update timer display
  useEffect(() => {
    if (!isRecording || !recordingStartTime) {
      setElapsed(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsed(Date.now() - recordingStartTime);
    }, 100);

    return () => clearInterval(interval);
  }, [isRecording, recordingStartTime]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div className="recording-toolbar">
      {!isPreviewing ? (
        <button className="recording-toolbar-btn" onClick={onStartPreview}>
          Start Preview
        </button>
      ) : (
        <>
          {!isRecording ? (
            <button
              className="recording-toolbar-btn recording-toolbar-btn--record"
              onClick={onStartRecording}
            >
              Start Recording
            </button>
          ) : (
            <button
              className="recording-toolbar-btn recording-toolbar-btn--stop"
              onClick={onStopRecording}
            >
              <span className="recording-dot" />
              <span className="recording-timer">{formatTime(elapsed)}</span>
              <span>Stop</span>
            </button>
          )}
          <button
            className={`recording-toolbar-btn recording-toolbar-btn--cancel ${isRecording ? 'disabled' : ''}`}
            onClick={stopPreview}
            disabled={isRecording}
          >
            Cancel
          </button>
        </>
      )}
    </div>
  );

  function stopPreview() {
    if (!isRecording) {
      onStopPreview();
    }
  }
};
