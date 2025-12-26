import { contextBridge, ipcRenderer } from 'electron'

// Screenshot API
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
declare global {
  interface Window {
    electronAPI: {
      captureScreen: () => Promise<string>
      captureRegion: () => Promise<string | null>
      onScreenshotCaptured: (callback: (dataUrl: string) => void) => void
      onScreenshotBackground: (callback: (event: any, dataUrl: string) => void) => void
      removeScreenshotBackgroundListener: () => void
      confirmScreenshotRegion: (bounds: { x: number; y: number; width: number; height: number }) => void
      cancelScreenshot: () => void
      saveProject: (data: string, filePath: string) => Promise<boolean>
      loadProject: (filePath: string) => Promise<string>
      saveRecording: (buffer: ArrayBuffer, filePath: string) => Promise<boolean>
      getMediaDevices: () => Promise<MediaDeviceInfo[]>
    }
  }
}
