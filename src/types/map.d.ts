import { Card, ChessboardSetting } from './chessboard'

export type Version = number[]

export type VersionRange = (Version | 'auto')[]

export interface Map {
  id: string
  version: Version
  name: string
  author: string
  description: string
  cards: Card[]
  chessboard: ChessboardSetting
  extensions: {
    [key: string]: VersionRange
  }
}
