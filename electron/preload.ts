import { contextBridge, ipcRenderer } from 'electron'

// Screenshot & Screen Recording API
contextBridge.exposeInMainWorld('electronAPI', {
  // Screenshot
  captureScreen: () => ipcRenderer.invoke('screenshot:capture-screen'),
  captureRegion: () => ipcRenderer.invoke('screenshot:capture-region'),
  onScreenshotCaptured: (callback: (dataUrl: string) => void) => {
    ipcRenderer.on('screenshot:captured', (_event, dataUrl) => callback(dataUrl))
  },

  // Screenshot overlay (for overlay window)
  onScreenshotBackground: (callback: (event: any, dataUrl: string) => void) => {
    ipcRenderer.on('screenshot:background', callback)
  },
  removeScreenshotBackgroundListener: () => {
    ipcRenderer.removeAllListeners('screenshot:background')
  },
  confirmScreenshotRegion: (bounds: { x: number; y: number; width: number; height: number }) => {
    ipcRenderer.send('screenshot:region-selected', bounds)
  },
  cancelScreenshot: () => {
    ipcRenderer.send('screenshot:cancel')
  },

  // Screen Recording
  getDesktopSources: () => ipcRenderer.invoke('screen-recording:get-sources'),
  selectRecordingRegion: () => ipcRenderer.invoke('screen-recording:select-region'),
  getSystemAudioStatus: () => ipcRenderer.invoke('screen-recording:get-system-audio-status'),
  getDisplays: () => ipcRenderer.invoke('screen-recording:get-displays'),

  // Region selector (for region selector window)
  onRegionSelectorBackground: (callback: (event: any, dataUrl: string) => void) => {
    ipcRenderer.on('region-selector:background', callback)
  },
  removeRegionSelectorBackgroundListener: () => {
    ipcRenderer.removeAllListeners('region-selector:background')
  },
  confirmRecordingRegion: (bounds: { x: number; y: number; width: number; height: number }) => {
    ipcRenderer.send('region-selector:selected', bounds)
  },
  cancelRecordingRegion: () => {
    ipcRenderer.send('region-selector:cancel')
  },

  // File system
  saveProject: (data: string, filePath: string) =>
    ipcRenderer.invoke('file:save-project', data, filePath),
  loadProject: (filePath: string) =>
    ipcRenderer.invoke('file:load-project', filePath),
  saveRecording: (buffer: ArrayBuffer, filePath: string) =>
    ipcRenderer.invoke('file:save-recording', buffer, filePath),

  // Media devices
  getMediaDevices: () => navigator.mediaDevices.enumerateDevices()
})

// Types for renderer
export interface DesktopSource {
  id: string
  name: string
  type: 'screen' | 'window'
  thumbnail: string
  appIcon?: string
  display?: {
    id: number
    bounds: { x: number; y: number; width: number; height: number }
  }
}

export interface DisplayInfo {
  id: number
  label: string
  bounds: { x: number; y: number; width: number; height: number }
  workArea: { x: number; y: number; width: number; height: number }
  scaleFactor: number
  isPrimary: boolean
}

export interface SystemAudioStatus {
  supported: boolean
  message: string
}

declare global {
  interface Window {
    electronAPI: {
      // Screenshot
      captureScreen: () => Promise<string>
      captureRegion: () => Promise<string | null>
      onScreenshotCaptured: (callback: (dataUrl: string) => void) => void
      onScreenshotBackground: (callback: (event: any, dataUrl: string) => void) => void
      removeScreenshotBackgroundListener: () => void
      confirmScreenshotRegion: (bounds: { x: number; y: number; width: number; height: number }) => void
      cancelScreenshot: () => void

      // Screen Recording
      getDesktopSources: () => Promise<DesktopSource[]>
      selectRecordingRegion: () => Promise<{ x: number; y: number; width: number; height: number } | null>
      getSystemAudioStatus: () => Promise<SystemAudioStatus>
      getDisplays: () => Promise<DisplayInfo[]>
      onRegionSelectorBackground: (callback: (event: any, dataUrl: string) => void) => void
      removeRegionSelectorBackgroundListener: () => void
      confirmRecordingRegion: (bounds: { x: number; y: number; width: number; height: number }) => void
      cancelRecordingRegion: () => void

      // File system
      saveProject: (data: string, filePath: string) => Promise<boolean>
      loadProject: (filePath: string) => Promise<string>
      saveRecording: (buffer: ArrayBuffer, filePath: string) => Promise<boolean>

      // Media devices
      getMediaDevices: () => Promise<MediaDeviceInfo[]>
    }
  }
}
