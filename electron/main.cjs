const { app, BrowserWindow, clipboard, dialog, ipcMain, nativeImage, shell } = require('electron')
const path = require('path')
const fs = require('fs')

const isDev = !app.isPackaged

const getAppUrl = () =>
  isDev ? 'http://localhost:5173' : `file://${path.join(__dirname, '..', 'dist', 'index.html')}`

let mainWindow
let authState = {
  inProgress: false,
  allowedOrigins: new Set(),
  expectedOrigin: null,
}

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1b1c20',
      symbolColor: '#e5e7eb',
      height: 32,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  const appUrl = getAppUrl()
  const appOrigin = (() => {
    try {
      return new URL(appUrl).origin
    } catch {
      return null
    }
  })()
  win.loadURL(appUrl)
  win.maximize()
  mainWindow = win
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url) shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    if (!url) return
    if (appOrigin && url.startsWith(appOrigin)) return
    let nextOrigin = null
    try {
      nextOrigin = new URL(url).origin
    } catch {
      nextOrigin = null
    }
    if (authState.inProgress && nextOrigin && authState.allowedOrigins.has(nextOrigin)) {
      return
    }
    event.preventDefault()
    shell.openExternal(url)
  })
  // DevTools auto-open disabled for faster startup in dev.
}

app.whenReady().then(createWindow)

ipcMain.handle('auth:open', (event, payload) => {
  const url = payload?.url
  const expectedOrigin = payload?.expectedOrigin
  if (!url) return false
  const parent = BrowserWindow.fromWebContents(event.sender)
  if (!parent) return false

  let authOrigin = null
  try {
    authOrigin = new URL(url).origin
  } catch {
    authOrigin = null
  }

  authState = {
    inProgress: true,
    allowedOrigins: new Set(
      [authOrigin, expectedOrigin].filter((origin) => typeof origin === 'string' && origin.length > 0),
    ),
    expectedOrigin: expectedOrigin || null,
  }

  const handleAuthComplete = (_event, nextUrl) => {
    if (!nextUrl || typeof nextUrl !== 'string') return
    let nextOrigin = null
    try {
      nextOrigin = new URL(nextUrl).origin
    } catch {
      nextOrigin = null
    }
    if (!nextOrigin || nextOrigin !== authState.expectedOrigin) return
    authState.inProgress = false
    authState.allowedOrigins.clear()
    authState.expectedOrigin = null
    cleanup()
    if (parent && !parent.isDestroyed() && !parent.webContents.isDestroyed()) {
      parent.webContents.send('auth:complete')
      parent.webContents.loadURL(getAppUrl())
    }
  }

  const cleanup = () => {
    if (parent.webContents.isDestroyed()) return
    parent.webContents.removeListener('will-redirect', handleAuthComplete)
    parent.webContents.removeListener('will-navigate', handleAuthComplete)
  }

  parent.webContents.on('will-redirect', handleAuthComplete)
  parent.webContents.on('will-navigate', handleAuthComplete)
  parent.once('closed', cleanup)

  parent.webContents.loadURL(url)
  return true
})

ipcMain.handle('window:minimize', () => {
  const win = BrowserWindow.getFocusedWindow()
  if (win) win.minimize()
})

ipcMain.handle('window:toggle-maximize', () => {
  const win = BrowserWindow.getFocusedWindow()
  if (!win) return
  if (win.isMaximized()) {
    win.unmaximize()
  } else {
    win.maximize()
  }
})

ipcMain.handle('window:close', () => {
  const win = BrowserWindow.getFocusedWindow()
  if (win) win.close()
})

ipcMain.handle('image:copy', (_event, payload) => {
  const bytes = payload?.data
  if (!bytes) return false
  const buffer = Buffer.from(bytes)
  const image = nativeImage.createFromBuffer(buffer)
  clipboard.writeImage(image)
  return true
})

ipcMain.handle('image:save', async (_event, payload) => {
  const bytes = payload?.data
  const filename = payload?.filename || 'image'
  if (!bytes) return false
  const buffer = Buffer.from(bytes)
  const win = BrowserWindow.getFocusedWindow()
  const { canceled, filePath } = await dialog.showSaveDialog(win || undefined, {
    defaultPath: filename,
  })
  if (canceled || !filePath) return false
  fs.writeFileSync(filePath, buffer)
  return true
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
