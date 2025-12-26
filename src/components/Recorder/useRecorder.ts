import { useState, useRef, useCallback } from 'react';
import { Compositor } from '../../utils/compositor';

export interface UseRecorderReturn {
  isRecording: boolean;
  isPreviewing: boolean;
  cameraStream: MediaStream | null;
  screenStream: MediaStream | null;
  startPreview: () => Promise<void>;
  stopPreview: () => void;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob>;
}

const RECORDING_WIDTH = 1920;
const RECORDING_HEIGHT = 1080;
const BUBBLE_DIAMETER = 120;
const BUBBLE_MARGIN = 20;

export function useRecorder(): UseRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const compositorRef = useRef<Compositor | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);

  const startPreview = useCallback(async () => {
    try {
      // Get camera stream only for preview
      const camera = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: true,
      });

      setCameraStream(camera);
      setIsPreviewing(true);

      // Create hidden video element for camera
      const cameraVideo = document.createElement('video');
      cameraVideo.srcObject = camera;
      cameraVideo.muted = true;
      cameraVideo.playsInline = true;
      await cameraVideo.play();
      cameraVideoRef.current = cameraVideo;
    } catch (error) {
      console.error('Failed to start preview:', error);
      throw error;
    }
  }, []);

  const stopPreview = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
    }
    if (compositorRef.current) {
      compositorRef.current.stop();
      compositorRef.current = null;
    }
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
      cameraVideoRef.current = null;
    }
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = null;
      screenVideoRef.current = null;
    }
    setIsPreviewing(false);
    setIsRecording(false);
  }, [cameraStream, screenStream]);

  const startRecording = useCallback(async () => {
    if (!cameraStream || !cameraVideoRef.current) {
      throw new Error('Preview not started');
    }

    try {
      // Get screen stream when recording starts
      const screen = await navigator.mediaDevices.getDisplayMedia({
        video: { width: RECORDING_WIDTH, height: RECORDING_HEIGHT },
        audio: false,
      });

      setScreenStream(screen);

      const screenVideo = document.createElement('video');
      screenVideo.srcObject = screen;
      screenVideo.muted = true;
      screenVideo.playsInline = true;
      await screenVideo.play();
      screenVideoRef.current = screenVideo;

      // Initialize compositor
      const compositor = new Compositor(RECORDING_WIDTH, RECORDING_HEIGHT);
      compositor.setMainSource(screenVideo);
      compositor.setCameraSource(cameraVideoRef.current, {
        x: RECORDING_WIDTH - BUBBLE_DIAMETER - BUBBLE_MARGIN,
        y: RECORDING_HEIGHT - BUBBLE_DIAMETER - BUBBLE_MARGIN,
        diameter: BUBBLE_DIAMETER,
      });
      compositor.start();
      compositorRef.current = compositor;

      // Handle screen share stop
      screen.getVideoTracks()[0].onended = () => {
        stopRecording();
      };

      chunksRef.current = [];

      // Get composite stream and add audio from camera
      const compositeStream = compositor.getStream();
      const audioTrack = cameraStream.getAudioTracks()[0];
      if (audioTrack) {
        compositeStream.addTrack(audioTrack);
      }

      const mediaRecorder = new MediaRecorder(compositeStream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000,
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }, [cameraStream]);

  const stopRecording = useCallback(async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder) {
        reject(new Error('No recording in progress'));
        return;
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        chunksRef.current = [];
        setIsRecording(false);
        resolve(blob);
      };

      mediaRecorder.stop();
    });
  }, []);

  return {
    isRecording,
    isPreviewing,
    cameraStream,
    screenStream,
    startPreview,
    stopPreview,
    startRecording,
    stopRecording,
  };
}
