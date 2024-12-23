import { Chess, Chessboard } from '../types/chessboard'
import { Map } from '../types/map'
import { ExtensionInfo, ExtNameList } from '../types/extension'
import { ItemType, ResourceItem, ResourceVersion } from '../types/resource'
import { Settings } from '../types/settings'
import { GameData, Response } from '../types/game'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { api } from './index'

interface API {
  on: (type: string, callback: (data?: unknown) => void) => void
  off: (type: string) => void
  getTheme: () => Promise<{ isDark: boolean; primaryColor: string }>
  controlWindow: (action: string) => void
  updateConfig: () => void
  getGameStatus: () => Promise<boolean>
  startGame: (gamemode: string, mode: string, data: object) => Promise<string>
  getGamemode: (mode?: string) => Promise<string>
  chooseMap: () => Promise<boolean>
  getGameData: (reload?: boolean) => Promise<GameData>
  generateChessboard: (mapData: Map) => Chessboard
  showChessInfo: (chess: Chess, reverse?: boolean) => void
  getAvailableMoves: (pos: Position) => Position[]
  getExtensionsInfo: () => Promise<ExtensionInfo[]>
  getEnabledExtensions: () => Promise<ExtNameList>
  setEnabledExtensions: (enabledExtensions: ExtNameList) => Promise<void>
  importExtensions: () => Promise<void>
  fetchResourceItems: (type: ItemType, filter: string) => Promise<ResourceItem[]>
  fetchResourceVersions: (item: ResourceItem) => Promise<ResourceVersion[]>
  getDownloadPath: (item: ResourceItem, version: ResourceVersion) => Promise<string | null>
  downloadResource: (item: ResourceItem, version: ResourceVersion, path: string) => Promise<boolean>
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
