import { contextBridge, IpcRenderer, ipcRenderer } from 'electron/renderer'

const api = {
  startGame: (gamemode: string, mapData: object): Promise<string> => ipcRenderer.invoke('start-game', gamemode, mapData),
  onStopGame: (callback: () => void): IpcRenderer => ipcRenderer.on('stop-game', () => callback()),
  analyzeMap: (text: string): Promise<object> => ipcRenderer.invoke('analyze-map', text),
  getMapData: (): Promise<object> => ipcRenderer.invoke('get-map-data'),
  getExtensions: (): Promise<object[]> => ipcRenderer.invoke('get-extensions'),
  getSettings: (): Promise<object> => ipcRenderer.invoke('get-settings'),
  getSetting: (value: string): Promise<unknown> => ipcRenderer.invoke('get-setting', value),
  changeSettings: (changedValues: object): void =>
    ipcRenderer.send('change-settings', changedValues),
  versions: process.versions
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
