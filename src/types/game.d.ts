import { Chessboard } from './chessboard'
import { Map } from './map'
import { ExtensionInfo } from './extension'

export interface GameData {
  mapData: Map | null
  extensions: ExtensionInfo[]
  chessboard: Chessboard
}

export interface Response {
  status: string
  data?: unknown
}
