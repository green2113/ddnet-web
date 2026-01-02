const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

const isDev = !app.isPackaged

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  const appUrl = 'https://ddnet.under1111.com'
  win.loadURL(appUrl)
  win.maximize()
  if (isDev) {
    win.webContents.openDevTools()
  }
}

app.whenReady().then(createWindow)

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
