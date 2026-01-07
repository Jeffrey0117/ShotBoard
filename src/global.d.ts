/**
 * Global TypeScript declarations
 * Defines types for Electron preload API exposed to renderer
 */

interface SelectionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DesktopSource {
  id: string;
  name: string;
  type: 'screen' | 'window';
  thumbnail: string;
  appIcon?: string;
  display?: {
    id: number;
    bounds: SelectionBounds;
  };
}

interface DisplayInfo {
  id: number;
  label: string;
  bounds: SelectionBounds;
  workArea: SelectionBounds;
  scaleFactor: number;
  isPrimary: boolean;
}

interface SystemAudioStatus {
  supported: boolean;
  message: string;
}

interface ElectronAPI {
  // Screenshot
  captureScreen: () => Promise<string>;
  captureRegion: () => Promise<string | null>;
  onScreenshotCaptured: (callback: (dataUrl: string) => void) => void;

  // Screenshot overlay (for overlay window)
  onScreenshotBackground: (callback: (event: unknown, dataUrl: string) => void) => void;
  removeScreenshotBackgroundListener: () => void;
  confirmScreenshotRegion: (bounds: SelectionBounds) => void;
  cancelScreenshot: () => void;

  // Screen Recording
  getDesktopSources: () => Promise<DesktopSource[]>;
  selectRecordingRegion: () => Promise<SelectionBounds | null>;
  getSystemAudioStatus: () => Promise<SystemAudioStatus>;
  getDisplays: () => Promise<DisplayInfo[]>;
  onRegionSelectorBackground: (callback: (event: unknown, dataUrl: string) => void) => void;
  removeRegionSelectorBackgroundListener: () => void;
  confirmRecordingRegion: (bounds: SelectionBounds) => void;
  cancelRecordingRegion: () => void;

  // File system
  saveProject: (data: string, filePath: string) => Promise<boolean>;
  loadProject: (filePath: string) => Promise<string>;
  saveRecording: (buffer: ArrayBuffer, filePath: string) => Promise<boolean>;

  // Media devices
  getMediaDevices: () => Promise<MediaDeviceInfo[]>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
