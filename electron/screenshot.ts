import { desktopCapturer, screen, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';

let overlayWindow: BrowserWindow | null = null;

export async function captureScreen(): Promise<string> {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;
  const scaleFactor = primaryDisplay.scaleFactor;

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: width * scaleFactor,
      height: height * scaleFactor,
    },
  });

  if (sources.length === 0) {
    throw new Error('No screen source found');
  }

  const primarySource = sources[0];
  return primarySource.thumbnail.toDataURL();
}

export async function captureRegion(): Promise<string | null> {
  return new Promise(async (resolve) => {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;
    const fullScreenshot = await captureScreen();

    overlayWindow = new BrowserWindow({
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

    overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    overlayWindow.setVisibleOnAllWorkspaces(true);

    if (process.env.NODE_ENV === 'development') {
      overlayWindow.loadURL('http://localhost:5173/screenshot-overlay.html');
    } else {
      overlayWindow.loadFile(path.join(__dirname, '../dist/screenshot-overlay.html'));
    }

    overlayWindow.webContents.on('did-finish-load', () => {
      overlayWindow?.webContents.send('screenshot:background', fullScreenshot);
    });

    const handleRegionSelected = async (
      _event: Electron.IpcMainEvent,
      bounds: { x: number; y: number; width: number; height: number }
    ) => {
      if (overlayWindow) {
        overlayWindow.close();
        overlayWindow = null;
      }
      const cropped = await cropScreenshot(fullScreenshot, bounds);
      resolve(cropped);
    };

    const handleCancel = () => {
      if (overlayWindow) {
        overlayWindow.close();
        overlayWindow = null;
      }
      resolve(null);
    };

    ipcMain.once('screenshot:region-selected', handleRegionSelected);
    ipcMain.once('screenshot:cancel', handleCancel);

    overlayWindow.on('closed', () => {
      ipcMain.removeListener('screenshot:region-selected', handleRegionSelected);
      ipcMain.removeListener('screenshot:cancel', handleCancel);
      overlayWindow = null;
    });
  });
}

async function cropScreenshot(
  dataURL: string,
  bounds: { x: number; y: number; width: number; height: number }
): Promise<string> {
  const { nativeImage } = await import('electron');
  const image = nativeImage.createFromDataURL(dataURL);
  const cropped = image.crop({
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    width: Math.round(bounds.width),
    height: Math.round(bounds.height),
  });
  return cropped.toDataURL();
}

export function registerScreenshotHandlers() {
  ipcMain.handle('screenshot:capture-screen', async () => {
    return await captureScreen();
  });
  ipcMain.handle('screenshot:capture-region', async () => {
    return await captureRegion();
  });
}

export function cleanup() {
  if (overlayWindow) {
    overlayWindow.close();
    overlayWindow = null;
  }
}
