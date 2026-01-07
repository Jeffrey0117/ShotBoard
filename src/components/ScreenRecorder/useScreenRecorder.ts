import { useState, useRef, useCallback } from 'react';
import { AudioMixer } from '../../utils/audioMixer';
import { ScreenCompositor } from './ScreenCompositor';
import { RecordingSource } from './SourcePicker';
import { BubbleConfig } from '../../utils/compositor';

export interface AudioSettings {
  microphone: boolean;
  systemAudio: boolean;
  microphoneDeviceId?: string;
  microphoneVolume: number;
  systemAudioVolume: number;
}

export interface OverlaySettings {
  enabled: boolean;
  whiteboard: boolean;
  camera: boolean;
  timer: boolean;
}

export interface ScreenRecorderConfig {
  resolution: {
    width: number;
    height: number;
  };
  frameRate: number;
  audio: AudioSettings;
  overlay: OverlaySettings;
  output: {
    format: 'webm' | 'mp4';
    videoBitrate: number;
    audioBitrate: number;
  };
}

export interface UseScreenRecorderReturn {
  // 狀態
  isRecording: boolean;
  isPaused: boolean;
  isPreviewing: boolean;
  duration: number;
  selectedSource: RecordingSource | null;
  previewStream: MediaStream | null;
  config: ScreenRecorderConfig;

  // 方法
  setSource: (source: RecordingSource) => void;
  startPreview: () => Promise<void>;
  stopPreview: () => void;
  startRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => Promise<Blob>;

  // 設置
  setConfig: (config: Partial<ScreenRecorderConfig>) => void;
  setAudioSettings: (settings: Partial<AudioSettings>) => void;
  setOverlaySettings: (settings: Partial<OverlaySettings>) => void;

  // 攝像頭控制
  updateBubbleConfig: (config: BubbleConfig) => void;
  cameraStream: MediaStream | null;
}

const DEFAULT_CONFIG: ScreenRecorderConfig = {
  resolution: { width: 1920, height: 1080 },
  frameRate: 30,
  audio: {
    microphone: true,
    systemAudio: true,
    microphoneVolume: 1,
    systemAudioVolume: 1,
  },
  overlay: {
    enabled: true,
    whiteboard: true,
    camera: true,
    timer: true,
  },
  output: {
    format: 'webm',
    videoBitrate: 8_000_000,
    audioBitrate: 128_000,
  },
};

const BUBBLE_DIAMETER = 180;
const BUBBLE_MARGIN = 30;

export function useScreenRecorder(): UseScreenRecorderReturn {
  // 狀態
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [selectedSource, setSelectedSource] = useState<RecordingSource | null>(null);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [config, setConfigState] = useState<ScreenRecorderConfig>(DEFAULT_CONFIG);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Refs
  const compositorRef = useRef<ScreenCompositor | null>(null);
  const audioMixerRef = useRef<AudioMixer | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<number | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const bubbleConfigRef = useRef<BubbleConfig>({
    x: DEFAULT_CONFIG.resolution.width - BUBBLE_DIAMETER - BUBBLE_MARGIN,
    y: DEFAULT_CONFIG.resolution.height - BUBBLE_DIAMETER - BUBBLE_MARGIN,
    diameter: BUBBLE_DIAMETER,
    shape: 'circle',
    visible: true,
    borderRadius: 16,
  });

  // 設置來源
  const setSource = useCallback((source: RecordingSource) => {
    setSelectedSource(source);
  }, []);

  // 更新配置
  const setConfig = useCallback((newConfig: Partial<ScreenRecorderConfig>) => {
    setConfigState((prev) => ({ ...prev, ...newConfig }));
  }, []);

  const setAudioSettings = useCallback((settings: Partial<AudioSettings>) => {
    setConfigState((prev) => ({
      ...prev,
      audio: { ...prev.audio, ...settings },
    }));

    // 即時更新音訊混合器
    if (audioMixerRef.current) {
      if (settings.microphoneVolume !== undefined) {
        audioMixerRef.current.setMicrophoneVolume(settings.microphoneVolume);
      }
      if (settings.systemAudioVolume !== undefined) {
        audioMixerRef.current.setSystemAudioVolume(settings.systemAudioVolume);
      }
    }
  }, []);

  const setOverlaySettings = useCallback((settings: Partial<OverlaySettings>) => {
    setConfigState((prev) => ({
      ...prev,
      overlay: { ...prev.overlay, ...settings },
    }));
  }, []);

  // 更新攝像頭氣泡配置
  const updateBubbleConfig = useCallback((bubbleConfig: BubbleConfig) => {
    bubbleConfigRef.current = bubbleConfig;
    if (compositorRef.current) {
      compositorRef.current.updateBubbleConfig(bubbleConfig);
    }
  }, []);

  // 獲取螢幕串流
  const getScreenStream = useCallback(async (): Promise<MediaStream> => {
    if (!selectedSource) {
      throw new Error('No source selected');
    }

    const constraints: MediaStreamConstraints = {
      video: {
        // @ts-expect-error - Electron specific constraint
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: selectedSource.sourceId,
          minWidth: config.resolution.width,
          maxWidth: config.resolution.width,
          minHeight: config.resolution.height,
          maxHeight: config.resolution.height,
          minFrameRate: config.frameRate,
          maxFrameRate: config.frameRate,
        },
      },
      audio: config.audio.systemAudio
        ? {
            // @ts-expect-error - Electron specific constraint
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: selectedSource.sourceId,
            },
          }
        : false,
    };

    return navigator.mediaDevices.getUserMedia(constraints);
  }, [selectedSource, config.resolution, config.frameRate, config.audio.systemAudio]);

  // 獲取攝像頭串流
  const getCameraStream = useCallback(async (): Promise<MediaStream> => {
    return navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' },
      audio: config.audio.microphone
        ? { deviceId: config.audio.microphoneDeviceId }
        : false,
    });
  }, [config.audio.microphone, config.audio.microphoneDeviceId]);

  // 開始預覽
  const startPreview = useCallback(async () => {
    if (!selectedSource) {
      throw new Error('No source selected');
    }

    try {
      // 獲取螢幕串流
      const screenStream = await getScreenStream();
      screenStreamRef.current = screenStream;
      setPreviewStream(screenStream);

      // 如果啟用攝像頭，獲取攝像頭串流
      if (config.overlay.camera) {
        const camera = await getCameraStream();
        setCameraStream(camera);

        // 創建攝像頭視頻元素
        const cameraVideo = document.createElement('video');
        cameraVideo.srcObject = camera;
        cameraVideo.muted = true;
        cameraVideo.playsInline = true;
        await cameraVideo.play();
        cameraVideoRef.current = cameraVideo;
      }

      setIsPreviewing(true);
    } catch (error) {
      console.error('Failed to start preview:', error);
      throw error;
    }
  }, [selectedSource, getScreenStream, getCameraStream, config.overlay.camera]);

  // 停止預覽
  const stopPreview = useCallback(() => {
    // 停止螢幕串流
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    // 停止攝像頭串流
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }

    // 清理攝像頭視頻元素
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
      cameraVideoRef.current = null;
    }

    // 停止合成器
    if (compositorRef.current) {
      compositorRef.current.stop();
      compositorRef.current = null;
    }

    // 清理音訊混合器
    if (audioMixerRef.current) {
      audioMixerRef.current.dispose();
      audioMixerRef.current = null;
    }

    setPreviewStream(null);
    setIsPreviewing(false);
    setIsRecording(false);
    setIsPaused(false);
    setDuration(0);
  }, [cameraStream]);

  // 開始錄製
  const startRecording = useCallback(async () => {
    if (!screenStreamRef.current) {
      throw new Error('Preview not started');
    }

    try {
      const { resolution } = config;

      // 創建合成器
      const compositor = new ScreenCompositor(resolution.width, resolution.height);

      // 設置螢幕源
      const screenVideo = document.createElement('video');
      screenVideo.srcObject = screenStreamRef.current;
      screenVideo.muted = true;
      await screenVideo.play();
      compositor.setScreenSource(screenVideo);

      // 設置攝像頭（如果啟用）
      if (config.overlay.camera && cameraVideoRef.current) {
        compositor.setCameraSource(cameraVideoRef.current, bubbleConfigRef.current);
      }

      // 設置計時器（如果啟用）
      if (config.overlay.timer) {
        const startTime = Date.now();
        compositor.setTimerConfig({ enabled: true, startTime });
        recordingStartTimeRef.current = startTime;
      }

      compositor.start();
      compositorRef.current = compositor;

      // 創建音訊混合器
      const audioMixer = new AudioMixer();
      audioMixerRef.current = audioMixer;

      // 添加麥克風音訊
      if (config.audio.microphone && cameraStream) {
        audioMixer.addMicrophone(cameraStream);
        audioMixer.setMicrophoneVolume(config.audio.microphoneVolume);
      }

      // 添加系統音訊
      if (config.audio.systemAudio && screenStreamRef.current) {
        const audioTracks = screenStreamRef.current.getAudioTracks();
        if (audioTracks.length > 0) {
          audioMixer.addSystemAudio(screenStreamRef.current);
          audioMixer.setSystemAudioVolume(config.audio.systemAudioVolume);
        }
      }

      // 合成視訊和音訊串流
      const videoStream = compositor.getStream();
      const audioStream = audioMixer.getOutputStream();

      const combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioStream.getAudioTracks(),
      ]);

      // 創建 MediaRecorder
      chunksRef.current = [];
      const mimeType =
        config.output.format === 'webm'
          ? 'video/webm;codecs=vp9'
          : 'video/mp4';

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: config.output.videoBitrate,
        audioBitsPerSecond: config.output.audioBitrate,
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);

      // 開始計時
      durationIntervalRef.current = window.setInterval(() => {
        setDuration(Math.floor((Date.now() - recordingStartTimeRef.current) / 1000));
      }, 1000);

      setIsRecording(true);
      setIsPaused(false);
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }, [config, cameraStream]);

  // 暫停錄製
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);

      // 暫停計時
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
  }, []);

  // 繼續錄製
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);

      // 繼續計時
      const pausedDuration = duration;
      const resumeTime = Date.now();
      durationIntervalRef.current = window.setInterval(() => {
        setDuration(pausedDuration + Math.floor((Date.now() - resumeTime) / 1000));
      }, 1000);
    }
  }, [duration]);

  // 停止錄製
  const stopRecording = useCallback(async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder) {
        reject(new Error('No recording in progress'));
        return;
      }

      // 停止計時
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      mediaRecorder.onstop = () => {
        const mimeType =
          config.output.format === 'webm' ? 'video/webm' : 'video/mp4';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];

        setIsRecording(false);
        setIsPaused(false);
        setDuration(0);

        // 停止合成器
        if (compositorRef.current) {
          compositorRef.current.stop();
          compositorRef.current = null;
        }

        resolve(blob);
      };

      mediaRecorder.stop();
    });
  }, [config.output.format]);

  return {
    // 狀態
    isRecording,
    isPaused,
    isPreviewing,
    duration,
    selectedSource,
    previewStream,
    config,
    cameraStream,

    // 方法
    setSource,
    startPreview,
    stopPreview,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,

    // 設置
    setConfig,
    setAudioSettings,
    setOverlaySettings,

    // 攝像頭控制
    updateBubbleConfig,
  };
}
