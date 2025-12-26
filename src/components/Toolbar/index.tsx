import React, { useState, useEffect } from 'react';

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
    <div style={styles.container}>
      {!isPreviewing ? (
        <button style={styles.button} onClick={onStartPreview}>
          📷 Start Preview
        </button>
      ) : (
        <>
          {!isRecording ? (
            <button
              style={{ ...styles.button, ...styles.recordButton }}
              onClick={onStartRecording}
            >
              🔴 Start Recording
            </button>
          ) : (
            <button
              style={{ ...styles.button, ...styles.stopButton }}
              onClick={onStopRecording}
            >
              <span style={styles.recordingDot} />
              <span style={styles.timerText}>{formatTime(elapsed)}</span>
              <span>Stop</span>
            </button>
          )}
          <button
            style={{
              ...styles.button,
              ...styles.cancelButton,
              ...(isRecording ? styles.disabled : {}),
            }}
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

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: 12,
    padding: '12px 20px',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 12,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    zIndex: 10000,
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#4a4a4a',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  recordButton: {
    backgroundColor: '#e53935',
  },
  stopButton: {
    backgroundColor: '#e53935',
    minWidth: 160,
  },
  cancelButton: {
    backgroundColor: '#666',
  },
  disabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  recordingDot: {
    width: 10,
    height: 10,
    backgroundColor: '#fff',
    borderRadius: '50%',
    animation: 'pulse 1s ease-in-out infinite',
  },
  timerText: {
    fontFamily: 'monospace',
    fontWeight: 'bold',
    minWidth: 50,
  },
};

// Add keyframes for pulse animation
if (typeof document !== 'undefined') {
  const existingStyle = document.getElementById('toolbar-keyframes');
  if (!existingStyle) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'toolbar-keyframes';
    styleSheet.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
    `;
    document.head.appendChild(styleSheet);
  }
}
