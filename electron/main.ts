import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron'
import path from 'path'
import { registerScreenshotHandlers, captureScreen, captureRegion } from './screenshot'

// VITE_DEV_SERVER_URL is set by vite-plugin-electron
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'ShotBoard',
    backgroundColor: '#0f0f23'
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
