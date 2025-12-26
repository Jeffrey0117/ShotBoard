import React, { useCallback } from 'react';
import { useRecorder } from './useRecorder';
import { CameraBubble } from './CameraBubble';
import { Toolbar } from '../Toolbar';

export const Recorder: React.FC = () => {
  const {
    isRecording,
    isPreviewing,
    cameraStream,
    startPreview,
    stopPreview,
    startRecording,
    stopRecording,
  } = useRecorder();

  const handleStartPreview = useCallback(async () => {
    try {
      await startPreview();
    } catch (error) {
      console.error('Failed to start preview:', error);
      alert('Failed to start preview. Please check camera and screen permissions.');
    }
  }, [startPreview]);

  const handleStartRecording = useCallback(async () => {
    try {
      await startRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Failed to start recording.');
    }
  }, [startRecording]);

  const handleStopRecording = useCallback(async () => {
    try {
      const blob = await stopRecording();
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  }, [stopRecording]);

  return (
    <>
      <CameraBubble stream={cameraStream} />
      <Toolbar
        isPreviewing={isPreviewing}
        isRecording={isRecording}
        onStartPreview={handleStartPreview}
        onStopPreview={stopPreview}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
      />
    </>
  );
};

export { CameraBubble } from './CameraBubble';
export { useRecorder } from './useRecorder';
