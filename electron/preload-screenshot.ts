import { contextBridge, ipcRenderer } from 'electron';

// Screenshot overlay 專用的 preload
contextBridge.exposeInMainWorld('electronAPI', {
  // 接收背景截圖
  onScreenshotBackground: (callback: (event: unknown, dataURL: string) => void) => {
    ipcRenderer.on('screenshot:background', callback);
  },

  // 移除背景監聽
  removeScreenshotBackgroundListener: () => {
    ipcRenderer.removeAllListeners('screenshot:background');
  },

  // 確認選取區域
  confirmScreenshotRegion: (bounds: { x: number; y: number; width: number; height: number }) => {
    ipcRenderer.send('screenshot:region-selected', bounds);
  },

  // 取消截圖
  cancelScreenshot: () => {
    ipcRenderer.send('screenshot:cancel');
  },
});
