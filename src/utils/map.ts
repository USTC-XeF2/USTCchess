import type { Chessboard } from '../types/chessboard'
import type { Map, Version, VersionRange } from '../types/map'
import {
  createChess,
  isCard,
  isChessboardSetting,
  isPositionString,
  parsePosition,
  setChess
} from './chessboard'

export function isVersion(obj): obj is Version {
  return Array.isArray(obj) && obj.every((v) => typeof v === 'number')
}

export function isVersionRange(obj): obj is VersionRange {
  return Array.isArray(obj) && obj.every((v) => isVersion(v) || v === 'auto')
}

export function isMap(obj): obj is Map {
  if (typeof obj.id !== 'string') return false
  if (typeof obj.name !== 'string') return false
  if (typeof obj.author !== 'string') return false
  if (typeof obj.description !== 'string') return false

  if (!Array.isArray(obj.cards)) return false
  if (!obj.cards.every((card) => isCard(card))) return false

  if (!isVersion(obj.version)) return false
  if (!isChessboardSetting(obj.chessboard)) return false

  if (typeof obj.extensions !== 'object') return false
  if (!Array.isArray(Object.values(obj.extensions))) return false
  if (!Object.values(obj.extensions).every((v) => isVersionRange(v))) return false

  return true
}

export function generateChessboard(mapData: Map): Chessboard {
  const setting = mapData.chessboard
  const chessboard = Array.from({ length: setting.height }, () =>
    Array.from({ length: setting.width }, () => null)
  )
  for (const posString in mapData.chessboard.init) {
    if (!isPositionString(posString)) continue
    const id = mapData.chessboard.init[posString]
    const card = mapData.cards.filter((card) => card.id === id)
    if (card.length !== 1) continue
    setChess(chessboard, parsePosition(posString), createChess(card[0]))
  }
  return chessboard
}
