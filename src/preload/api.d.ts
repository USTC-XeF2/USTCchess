import { Chessboard } from '../types/chessboard'
import { Map } from '../types/map'
import { ExtensionInfo } from '../types/extension'
import { Settings } from '../types/settings'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { api } from './index'

interface API {
  startGame: (gamemode: string, mapData: Map) => Promise<string>
  onStopGame: (callback: () => void) => IpcRenderer
  analyzeMap: (text: string) => Promise<Map>
  getMapData: () => Promise<Map>
  getExtensions: () => Promise<ExtensionInfo[]>
  getEnabledExtensions: () => Promise<ExtensionInfo['key'][]>
  setEnabledExtensions: (enabledExtensions: ExtensionInfo['key'][]) => Promise<void>
  openExtensionFolder: () => void
  getSettings: () => Promise<Settings>
  getSetting: <T extends keyof Settings>(key: T) => Promise<Settings[T]>
  changeSettings: (changedSettings: Partial<Settings>) => Promise<Settings>
  getAbout: () => object[]
  generateChessboard: (mapData: Map) => Chessboard
}

declare global {
  interface Window {
    electronAPI: API
  }
}
