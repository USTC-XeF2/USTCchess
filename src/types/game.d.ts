import { Chessboard, Position } from './chessboard'
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

export interface GameInfo {
  camp: number
  mapData: Map
}

export interface GameState {
  currentTurn: number
  chessboard: Chessboard
}

export interface GamePrompt {
  lastMove: {
    from: Position
    to: Position
  }
  checkedPos: Position[]
}

export interface GameResult {
  winner: number
  info?: string
}
