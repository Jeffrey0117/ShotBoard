import { desktopCapturer, ipcMain, screen, BrowserWindow } from 'electron';
import * as path from 'path';

export interface DesktopSource {
  id: string;
  name: string;
  type: 'screen' | 'window';
  thumbnail: string;
  appIcon?: string;
  display?: {
    id: number;
    bounds: { x: number; y: number; width: number; height: number };
  };
}

let regionSelectorWindow: BrowserWindow | null = null;

/**
 * 獲取所有可用的螢幕和視窗來源
 */
export async function getDesktopSources(): Promise<DesktopSource[]> {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: 320, height: 180 },
    fetchWindowIcons: true,
  });

  const displays = screen.getAllDisplays();

  return sources.map((source) => {
    const isScreen = source.id.startsWith('screen:');
    const result: DesktopSource = {
      id: source.id,
      name: source.name,
      type: isScreen ? 'screen' : 'window',
      thumbnail: source.thumbnail.toDataURL(),
      appIcon: source.appIcon?.toDataURL(),
    };

    // 為螢幕來源添加顯示器信息
    if (isScreen) {
      const displayId = parseInt(source.id.replace('screen:', '').split(':')[0]);
      const display = displays.find((d) => d.id === displayId) || displays[0];
      if (display) {
        result.display = {
          id: display.id,
          bounds: display.bounds,
        };
      }
    }

    return result;
  });
}

/**
 * 開啟區域選擇器視窗
 */
export async function openRegionSelector(): Promise<{
  x: number;
  y: number;
  width: number;
  height: number;
} | null> {
  return new Promise(async (resolve) => {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;

    // 先截取全螢幕作為背景
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: width * primaryDisplay.scaleFactor,
        height: height * primaryDisplay.scaleFactor,
      },
    });

    const fullScreenshot = sources[0]?.thumbnail.toDataURL() || '';

    regionSelectorWindow = new BrowserWindow({
      x: 0,
      y: 0,
      width,
      height,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      fullscreen: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
    });

    regionSelectorWindow.setAlwaysOnTop(true, 'screen-saver');
    regionSelectorWindow.setVisibleOnAllWorkspaces(true);

    const isDev = process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL;
    if (isDev) {
      regionSelectorWindow.loadURL('http://localhost:5173/region-selector.html');
    } else {
      regionSelectorWindow.loadFile(path.join(__dirname, '../dist/region-selector.html'));
    }

    regionSelectorWindow.webContents.on('did-finish-load', () => {
      regionSelectorWindow?.webContents.send('region-selector:background', fullScreenshot);
    });

    const handleRegionSelected = (
      _event: Electron.IpcMainEvent,
      bounds: { x: number; y: number; width: number; height: number }
    ) => {
      if (regionSelectorWindow) {
        regionSelectorWindow.close();
        regionSelectorWindow = null;
      }
      resolve(bounds);
    };

    const handleCancel = () => {
      if (regionSelectorWindow) {
        regionSelectorWindow.close();
        regionSelectorWindow = null;
      }
      resolve(null);
    };

    ipcMain.once('region-selector:selected', handleRegionSelected);
    ipcMain.once('region-selector:cancel', handleCancel);

    regionSelectorWindow.on('closed', () => {
      ipcMain.removeListener('region-selector:selected', handleRegionSelected);
      ipcMain.removeListener('region-selector:cancel', handleCancel);
      regionSelectorWindow = null;
      resolve(null);
    });
  });
}

/**
 * 獲取系統音訊狀態
 * Windows 支援 loopback audio，macOS 需要額外設備
 */
export function getSystemAudioStatus(): {
  supported: boolean;
  message: string;
} {
  const platform = process.platform;

  if (platform === 'win32') {
    return {
      supported: true,
      message: '系統音訊錄製可用',
    };
  } else if (platform === 'darwin') {
    return {
      supported: false,
      message: 'macOS 需要安裝虛擬音訊設備（如 BlackHole）才能錄製系統音訊',
    };
  } else {
    return {
      supported: false,
      message: '此平台可能不支援系統音訊錄製',
    };
  }
}

/**
 * 註冊螢幕錄影相關的 IPC handlers
 */
export function registerScreenRecordingHandlers() {
  // 獲取可用的螢幕和視窗來源
  ipcMain.handle('screen-recording:get-sources', async () => {
    return await getDesktopSources();
  });

  // 開啟區域選擇器
  ipcMain.handle('screen-recording:select-region', async () => {
    return await openRegionSelector();
  });

  // 獲取系統音訊狀態
  ipcMain.handle('screen-recording:get-system-audio-status', () => {
    return getSystemAudioStatus();
  });

  // 獲取顯示器信息
  ipcMain.handle('screen-recording:get-displays', () => {
    return screen.getAllDisplays().map((display) => ({
      id: display.id,
      label: display.label,
      bounds: display.bounds,
      workArea: display.workArea,
      scaleFactor: display.scaleFactor,
      isPrimary: display.id === screen.getPrimaryDisplay().id,
    }));
  });
}

export function cleanup() {
  if (regionSelectorWindow) {
    regionSelectorWindow.close();
    regionSelectorWindow = null;
  }
}
