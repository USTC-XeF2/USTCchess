import { contextBridge, ipcRenderer } from 'electron'

import type { API } from './api'

const api: API = {
  startGame: (gamemode, mapData) => ipcRenderer.invoke('start-game', gamemode, mapData),
  onStopGame: (callback) => ipcRenderer.on('stop-game', () => callback()),
  analyzeMap: (text) => ipcRenderer.invoke('analyze-map', text),
  getExtensions: () => ipcRenderer.invoke('get-extensions'),
  getEnabledExtensions: () => ipcRenderer.invoke('get-enabled-extensions'),
  setEnabledExtensions: (enabledExtensions) =>
    ipcRenderer.invoke('set-enabled-extensions', enabledExtensions),
  openExtensionFolder: () => ipcRenderer.send('open-extension-folder'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  getSetting: (value) => ipcRenderer.invoke('get-setting', value),
  changeSettings: (changedSettings) => ipcRenderer.invoke('change-settings', changedSettings),
  getAbout: () => ipcRenderer.sendSync('get-about'),
  generateChessboard: (mapData) => ipcRenderer.sendSync('generate-chessboard', mapData),
  contact: (type, data = {}) => ipcRenderer.invoke('contact', type, data)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electronAPI = api
}
