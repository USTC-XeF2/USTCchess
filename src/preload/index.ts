import { contextBridge, ipcRenderer } from 'electron'

import type { API } from './api'

const api: API = {
  on: (type, callback) => ipcRenderer.on(type, (_e, data?) => callback(data)),
  controlWindow: (action) => ipcRenderer.send('control-window', action),
  getIsDark: () => ipcRenderer.invoke('get-is-dark'),
  getGameStatus: () => ipcRenderer.invoke('get-game-status'),
  startGame: (gamemode) => ipcRenderer.invoke('start-game', gamemode),
  getMap: (reload = false) => ipcRenderer.invoke('get-map', reload),
  chooseMap: () => ipcRenderer.invoke('choose-map'),
  generateChessboard: (mapData = undefined) => ipcRenderer.sendSync('generate-chessboard', mapData),
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
