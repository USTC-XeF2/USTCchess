import { Card } from './chessboard'
import { Version } from './map'

export interface ExtensionInfo {
  key: string
  name: string
  author: string
  version: Version
}

export interface Extension extends ExtensionInfo {
  init: (cards: Card[]) => void
}
