import { Chessboard } from '../types/chessboard'
import { Map } from '../types/map'
import { ExtensionInfo } from '../types/extension'
import { Settings } from '../types/settings'
import { Response } from '../types/net'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { api } from './index'

interface API {
  getGameStatus: () => Promise<boolean>
  startGame: (gamemode: string, mapData: Map) => Promise<string>
  onStopGame: (callback: () => void) => IpcRenderer
  generateChessboard: (mapData: Map) => Chessboard
  analyzeMap: (text: string) => Promise<Map>
  getExtensionsInfo: () => Promise<ExtensionInfo[]>
  getEnabledExtensions: () => Promise<ExtensionInfo['key'][]>
  setEnabledExtensions: (enabledExtensions: ExtensionInfo['key'][]) => Promise<void>
  openExtensionFolder: () => void
  getSettings: () => Promise<Settings>
  getSetting: <T extends keyof Settings>(key: T) => Promise<Settings[T]>
  changeSettings: (changedSettings: Partial<Settings>) => Promise<Settings>
  getAbout: () => object[]
  contact: (type: string, data?: unknown) => Promise<Response>
  wait: (type: string, callback: () => void) => void
}

declare global {
  interface Window {
    electronAPI: API
  }
}
