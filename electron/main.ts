import { app, BrowserWindow, globalShortcut, ipcMain, desktopCapturer, session } from 'electron'
import path from 'path'
import { registerScreenshotHandlers, captureScreen, captureRegion } from './screenshot'
import { registerScreenRecordingHandlers } from './screenRecording'

// Performance optimizations
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-background-timer-throttling')

// VITE_DEV_SERVER_URL is set by vite-plugin-electron
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false, // Don't show until ready
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: false, // Keep running at full speed when recording
    },
    title: 'ShotBoard',
    backgroundColor: '#1a1a2e'
  })

  // Show window when ready to prevent white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function registerShortcuts() {
  // F12: Toggle DevTools
  globalShortcut.register('F12', () => {
    mainWindow?.webContents.toggleDevTools()
  })

  // Ctrl+Shift+2: 框選截圖
  globalShortcut.register('CommandOrControl+Shift+2', async () => {
    const screenshot = await captureRegion()
    if (screenshot && mainWindow) {
      mainWindow.webContents.send('screenshot:captured', screenshot)
    }
  })

  // Ctrl+Shift+3: 全螢幕截圖
  globalShortcut.register('CommandOrControl+Shift+3', async () => {
    const screenshot = await captureScreen()
    if (mainWindow) {
      mainWindow.webContents.send('screenshot:captured', screenshot)
    }
  })
}

app.whenReady().then(() => {
  createWindow()
  registerShortcuts()
  registerScreenshotHandlers()
  registerScreenRecordingHandlers()

  // Handle getDisplayMedia for screen recording
  session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] })
    // Use the first screen source (primary display)
    if (sources.length > 0) {
      callback({ video: sources[0] })
    } else {
      callback({})
    }
  })
})

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

// IPC handlers for file system
ipcMain.handle('file:save-project', async (_event, projectData: string, filePath: string) => {
  const fs = await import('fs/promises')
  await fs.writeFile(filePath, projectData, 'utf-8')
  return true
})

ipcMain.handle('file:load-project', async (_event, filePath: string) => {
  const fs = await import('fs/promises')
  const data = await fs.readFile(filePath, 'utf-8')
  return data
})

ipcMain.handle('file:save-recording', async (_event, buffer: ArrayBuffer, filePath: string) => {
  const fs = await import('fs/promises')
  await fs.writeFile(filePath, Buffer.from(buffer))
  return true
})
