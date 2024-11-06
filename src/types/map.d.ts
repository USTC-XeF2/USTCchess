import { Card, ChessboardSetting } from './chessboard'

export interface VersionRanges {
  [key: string]: string
}

export interface Map {
  id: string
  version: string
  name: string
  author: string
  description: string
  cards: Card[]
  chessboard: ChessboardSetting
  extensions: VersionRanges
}
