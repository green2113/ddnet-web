const { contextBridge, ipcRenderer, desktopCapturer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  openAuth: (url, expectedOrigin) => ipcRenderer.invoke('auth:open', { url, expectedOrigin }),
  copyImage: (payload) => ipcRenderer.invoke('image:copy', payload),
  saveImage: (payload) => ipcRenderer.invoke('image:save', payload),
  copyImageFromUrl: (payload) => ipcRenderer.invoke('image:copy-url', payload),
  saveImageFromUrl: (payload) => ipcRenderer.invoke('image:save-url', payload),
  getDesktopSources: async () => {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 640, height: 360 },
      fetchWindowIcons: true,
    })
    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL(),
    }))
  },
  hasNativeControls: true,
})

ipcRenderer.on('auth:complete', () => {
  window.dispatchEvent(new Event('auth-complete'))
})
