import { useState, useRef, useCallback } from 'react';
import { Compositor, BubbleConfig } from '../../utils/compositor';
import { CameraSettings, DEFAULT_CAMERA_SETTINGS } from './CameraBubble';

export interface UseRecorderOptions {
  getCanvas: () => HTMLCanvasElement | null;
  getBackgroundColor: () => string;
  getZoom: () => number;
}

export interface UseRecorderReturn {
  isRecording: boolean;
  isPreviewing: boolean;
  cameraStream: MediaStream | null;
  recordingStartTime: number | null;
  cameraSettings: CameraSettings;
  startPreview: () => Promise<void>;
  stopPreview: () => void;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob>;
  updateBubbleConfig: (config: BubbleConfig) => void;
  setCameraSettings: (settings: CameraSettings) => void;
}

const RECORDING_WIDTH = 1920;
const RECORDING_HEIGHT = 1080;
const BUBBLE_DIAMETER = 180;
const BUBBLE_MARGIN = 30;

export function useRecorder(options: UseRecorderOptions): UseRecorderReturn {
  const { getCanvas, getBackgroundColor, getZoom } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [cameraSettings, setCameraSettings] = useState<CameraSettings>(DEFAULT_CAMERA_SETTINGS);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const compositorRef = useRef<Compositor | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const bubbleConfigRef = useRef<BubbleConfig>({
    x: RECORDING_WIDTH - BUBBLE_DIAMETER - BUBBLE_MARGIN,
    y: RECORDING_HEIGHT - BUBBLE_DIAMETER - BUBBLE_MARGIN,
    diameter: BUBBLE_DIAMETER,
    shape: DEFAULT_CAMERA_SETTINGS.shape,
    visible: DEFAULT_CAMERA_SETTINGS.visible,
    borderRadius: DEFAULT_CAMERA_SETTINGS.borderRadius,
  });

  const updateBubbleConfig = useCallback((config: BubbleConfig) => {
    bubbleConfigRef.current = config;
    if (compositorRef.current) {
      compositorRef.current.updateBubbleConfig(config);
    }
  }, []);

  const startPreview = useCallback(async () => {
    try {
      const camera = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: true,
      });

      setCameraStream(camera);
      setIsPreviewing(true);

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
    if (compositorRef.current) {
      compositorRef.current.stop();
      compositorRef.current = null;
    }
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
      cameraVideoRef.current = null;
    }
    setIsPreviewing(false);
    setIsRecording(false);
    setRecordingStartTime(null);
  }, [cameraStream]);

  const startRecording = useCallback(async () => {
    if (!cameraStream || !cameraVideoRef.current) {
      throw new Error('Preview not started');
    }

    // Verify we can get the canvas
    const testCanvas = getCanvas();
    if (!testCanvas) {
      throw new Error('Canvas not available');
    }

    try {
      // Initialize Compositor with canvas getter, background color getter, and zoom getter
      const compositor = new Compositor(RECORDING_WIDTH, RECORDING_HEIGHT);
      compositor.setSourceCanvasGetter(getCanvas);
      compositor.setBackgroundColorGetter(getBackgroundColor);
      compositor.setZoomGetter(getZoom);
      compositor.setCameraSource(cameraVideoRef.current, bubbleConfigRef.current);

      // Enable recording timer
      const startTime = Date.now();
      compositor.setTimerConfig({
        enabled: true,
        startTime,
      });
      setRecordingStartTime(startTime);

      compositor.start();
      compositorRef.current = compositor;

      chunksRef.current = [];

      // Get composite stream and add audio track
      const compositeStream = compositor.getStream();
      const audioTrack = cameraStream.getAudioTracks()[0];
      if (audioTrack) {
        compositeStream.addTrack(audioTrack);
      }

      const mediaRecorder = new MediaRecorder(compositeStream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 8000000,  // 8 Mbps for better color fidelity
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }, [cameraStream, getCanvas, getBackgroundColor, getZoom]);

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
        setRecordingStartTime(null);

        // Stop compositor
        if (compositorRef.current) {
          compositorRef.current.stop();
          compositorRef.current = null;
        }

        resolve(blob);
      };

      mediaRecorder.stop();
    });
  }, []);

  return {
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
  };
}
