import { Chess, Chessboard } from '../types/chessboard'
import { Map } from '../types/map'
import { ExtensionInfo, ExtNameList } from '../types/extension'
import { Settings } from '../types/settings'
import { GameData, Response } from '../types/game'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { api } from './index'

interface API {
  on: (type: string, callback: (data?: unknown) => void) => void
  getTheme: () => Promise<{ isDark: boolean; primaryColor: string }>
  controlWindow: (action: string) => void
  updateConfig: () => void
  getGameStatus: () => Promise<boolean>
  startGame: (gamemode: string) => Promise<string>
  chooseMap: () => Promise<boolean>
  getGameData: (reload?: boolean) => Promise<GameData>
  generateChessboard: (mapData: Map) => Chessboard
  showChessInfo: (chess: Chess, reverse?: boolean) => void
  getAvailableMoves: (pos: Position) => Position[]
  getExtensionsInfo: () => Promise<ExtensionInfo[]>
  getEnabledExtensions: () => Promise<ExtNameList>
  setEnabledExtensions: (enabledExtensions: ExtNameList) => Promise<void>
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
