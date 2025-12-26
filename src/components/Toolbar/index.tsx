import React from 'react';

interface ToolbarProps {
  isPreviewing: boolean;
  isRecording: boolean;
  onStartPreview: () => void;
  onStopPreview: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  isPreviewing,
  isRecording,
  onStartPreview,
  onStopPreview,
  onStartRecording,
  onStopRecording,
}) => {
  return (
    <div style={styles.container}>
      {!isPreviewing ? (
        <button style={styles.button} onClick={onStartPreview}>
          Start Preview
        </button>
      ) : (
        <>
          {!isRecording ? (
            <button
              style={{ ...styles.button, ...styles.recordButton }}
              onClick={onStartRecording}
            >
              Start Recording
            </button>
          ) : (
            <button
              style={{ ...styles.button, ...styles.stopButton }}
              onClick={onStopRecording}
            >
              <span style={styles.recordingDot} />
              Stop Recording
            </button>
          )}
          <button
            style={{ ...styles.button, ...styles.cancelButton }}
            onClick={onStopPreview}
            disabled={isRecording}
          >
            Cancel
          </button>
        </>
      )}
    </div>
  );
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    zIndex: 1001,
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
  },
  cancelButton: {
    backgroundColor: '#666',
  },
  recordingDot: {
    width: 10,
    height: 10,
    backgroundColor: '#fff',
    borderRadius: '50%',
    animation: 'pulse 1s ease-in-out infinite',
  },
};

// Add keyframes for pulse animation
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
  `;
  document.head.appendChild(styleSheet);
}
