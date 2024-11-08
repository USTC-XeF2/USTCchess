import { Chessboard } from '../types/chessboard'
import { Map } from '../types/map'
import { ExtensionInfo } from '../types/extension'
import { Settings } from '../types/settings'
import { Response } from '../types/net'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { api } from './index'

interface API {
  on: (type: string, callback: (data?: unknown) => void) => void
  getIsDark: () => Promise<boolean>
  controlWindow: (action: string) => void
  getGameStatus: () => Promise<boolean>
  startGame: (gamemode: string, mapData: Map) => Promise<string>
  onStopGame: (callback: () => void) => IpcRenderer
  getMap: () => Map | undefined
  chooseMap: () => Promise<Map | null>
  generateChessboard: (mapData?: Map) => Chessboard
  getAvailableMoves: (pos: Position) => Position[]
  getExtensionsInfo: () => Promise<ExtensionInfo[]>
  getEnabledExtensions: () => Promise<ExtensionInfo['key'][]>
  setEnabledExtensions: (enabledExtensions: ExtensionInfo['key'][]) => Promise<void>
  importExtensions: () => Promise<void>
  getSettings: () => Promise<Settings>
  getSetting: <T extends keyof Settings>(key: T) => Promise<Settings[T]>
  changeSettings: (changedSettings: Partial<Settings>) => Promise<void>
  openExtensionFolder: () => void
  chooseExtensionFolder: () => Promise<void>
  getAbout: () => object[]
  contact: (type: string, data?: unknown) => Promise<Response>
}

declare global {
  interface Window {
    electronAPI: API
  }
}
