import { Chess, Chessboard, Position } from './chessboard'

export interface ExtensionInfo {
  key: string
  name: string
  author: string
  version: string
}

export interface Extension extends ExtensionInfo {
  API: ExtensionAPI // defined in chessboard.ts
  init?: () => void
  onMove?: (chessboard: Chessboard, pos: Position, availableMoves: Position[]) => Position[]
  onDeath?: (chessboard: Chessboard, pos: Position, oldChess: Chess) => void
}
