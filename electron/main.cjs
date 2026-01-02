const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')

const isDev = !app.isPackaged

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

  const appUrl = 'https://ddnet.under1111.com'
  win.loadURL(appUrl)
  win.maximize()
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
  if (isDev) {
    win.webContents.openDevTools()
  }
}

app.whenReady().then(createWindow)

ipcMain.handle('auth:open', (event, payload) => {
  const url = payload?.url
  if (!url) return false
  const parent = BrowserWindow.fromWebContents(event.sender)
  if (!parent) return false

  const authWin = new BrowserWindow({
    width: 520,
    height: 720,
    parent,
    modal: true,
    show: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    autoHideMenuBar: true,
  })

  const parentUrl = parent.webContents.getURL()
  const parentOrigin = parentUrl ? new URL(parentUrl).origin : null
  let completed = false

  const handleNav = (_event, nextUrl) => {
    if (!parentOrigin) return
    if (!nextUrl || typeof nextUrl !== 'string') return
    if (!nextUrl.startsWith(parentOrigin)) return
    if (completed) return
    completed = true
    parent.webContents.send('auth:complete')
    authWin.close()
  }

  authWin.webContents.on('will-redirect', handleNav)
  authWin.webContents.on('will-navigate', handleNav)
  authWin.on('closed', () => {
    authWin.webContents.removeListener('will-redirect', handleNav)
    authWin.webContents.removeListener('will-navigate', handleNav)
  })

  authWin.loadURL(url)
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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
