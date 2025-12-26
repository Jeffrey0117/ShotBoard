import { useRef, useEffect, useCallback } from 'react';
import { Whiteboard, WhiteboardAPI } from './components/Whiteboard';
import { Toolbar } from './components/Toolbar';
import { CameraBubble } from './components/Recorder/CameraBubble';
import { useRecorder } from './components/Recorder/useRecorder';
import { useProjectStore } from './stores/projectStore';
import './App.css';

function App() {
  const whiteboardRef = useRef<WhiteboardAPI>(null);
  const isDirty = useProjectStore((state) => state.isDirty);

  // Provide getCanvas and getBackgroundColor functions to useRecorder
  const getCanvas = useCallback(() => {
    return whiteboardRef.current?.getCanvas() ?? null;
  }, []);

  const getBackgroundColor = useCallback(() => {
    return whiteboardRef.current?.getBackgroundColor() ?? '#1a1a2e';
  }, []);

  const {
    isRecording,
    isPreviewing,
    cameraStream,
    recordingStartTime,
    cameraSettings,
    startPreview,
    stopPreview,
    startRecording,
    stopRecording,
    updateBubbleConfig,
    setCameraSettings,
  } = useRecorder({ getCanvas, getBackgroundColor });

  // Listen for screenshot captures
  useEffect(() => {
    const handleScreenshot = (dataUrl: string) => {
      whiteboardRef.current?.insertImage(dataUrl);
    };
    window.electronAPI?.onScreenshotCaptured(handleScreenshot);
  }, []);

  const handleStopRecording = async () => {
    const blob = await stopRecording();
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording_${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">ShotBoard</h1>
        <div className="app-status">
          <div className={`dirty-indicator ${isDirty ? '' : 'saved'}`} />
          <span>{isDirty ? 'Unsaved' : 'Saved'}</span>
        </div>
      </header>

      <main className="app-main">
        <Whiteboard ref={whiteboardRef} className="whiteboard-container" />

        <Toolbar
          isPreviewing={isPreviewing}
          isRecording={isRecording}
          recordingStartTime={recordingStartTime}
          onStartPreview={startPreview}
          onStopPreview={stopPreview}
          onStartRecording={startRecording}
          onStopRecording={handleStopRecording}
        />

        {isPreviewing && cameraStream && (
          <CameraBubble
            stream={cameraStream}
            onBubbleConfigChange={updateBubbleConfig}
            settings={cameraSettings}
            onSettingsChange={setCameraSettings}
          />
        )}
      </main>
    </div>
  );
}

export default App;
