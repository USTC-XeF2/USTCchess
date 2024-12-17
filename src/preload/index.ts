import { contextBridge, ipcRenderer } from 'electron'

import type { API } from './api'

const api: API = {
  on: (type, callback) => ipcRenderer.on(type, (_e, data?) => callback(data)),
  off: (type) => ipcRenderer.removeAllListeners(type),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  controlWindow: (action) => ipcRenderer.send('control-window', action),
  updateConfig: () => ipcRenderer.send('update-config'),
  getGameStatus: () => ipcRenderer.invoke('get-game-status'),
  startGame: (gamemode, mode, data) => ipcRenderer.invoke('start-game', gamemode, mode, data),
  getGamemode: (mode) => ipcRenderer.invoke('get-gamemode', mode),
  chooseMap: () => ipcRenderer.invoke('choose-map'),
  getGameData: (reload = false) => ipcRenderer.invoke('get-game-data', reload),
  generateChessboard: (mapData) => ipcRenderer.sendSync('generate-chessboard', mapData),
  showChessInfo: (chess, reverse = false) => ipcRenderer.send('show-chess-info', chess, reverse),
  getAvailableMoves: (pos) => ipcRenderer.sendSync('get-available-moves', pos),
  getExtensionsInfo: () => ipcRenderer.invoke('get-extensions-info'),
  getEnabledExtensions: () => ipcRenderer.invoke('get-enabled-extensions'),
  setEnabledExtensions: (enabledExtensions) =>
    ipcRenderer.invoke('set-enabled-extensions', enabledExtensions),
  importExtensions: () => ipcRenderer.invoke('import-extensions'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  getSetting: (value) => ipcRenderer.invoke('get-setting', value),
  changeSettings: (changedSettings) => ipcRenderer.invoke('change-settings', changedSettings),
  openExtensionFolder: () => ipcRenderer.send('open-extension-folder'),
  chooseExtensionFolder: () => ipcRenderer.invoke('choose-extension-folder'),
  getAbout: () => ipcRenderer.sendSync('get-about'),
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
