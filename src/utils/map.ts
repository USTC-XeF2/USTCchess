import semver from 'semver'

import type { Chessboard } from '../types/chessboard'
import type { Map, VersionRanges } from '../types/map'
import {
  API,
  createChess,
  isCard,
  isChessboardSetting,
  isPositionString,
  parsePosition
} from './chessboard'

export function isVersionRanges(obj): obj is VersionRanges {
  if (typeof obj !== 'object') return false
  if (!Array.isArray(Object.values(obj))) return false
  if (!Object.values(obj).every((v) => typeof v === 'string' && semver.validRange(v))) return false
  return true
}

export function isMap(obj): obj is Map {
  if (typeof obj.id !== 'string') return false
  if (!semver.valid(obj.version)) return false
  if (typeof obj.name !== 'string') return false
  if (typeof obj.author !== 'string') return false
  if (typeof obj.description !== 'string') return false

  if (!Array.isArray(obj.cards)) return false
  if (!obj.cards.every((card) => isCard(card))) return false
  if (!isChessboardSetting(obj.chessboard)) return false
  if (!isVersionRanges(obj.extensions)) return false

  return true
}

export function getInfo(mapData: Map): [string, string] {
  return [
    `${mapData.name} v${mapData.version}`,
    [
      mapData.description,
      `\n作者：${mapData.author}`,
      '\n棋子：',
      ...mapData.cards.map((card) => `    ${card.name}（${card.camp}阵营）`),
      '\n扩展：',
      ...Object.entries(mapData.extensions).map(([key, version]) => `    ${key}${version}`)
    ].join('\n')
  ]
}

export function generateChessboard(mapData: Map): [Chessboard, number] {
  const setting = mapData.chessboard
  const chessboard = Array.from({ length: setting.height }, () =>
    Array.from({ length: setting.width }, () => null)
  )
  let totalChess = 0
  for (const posString in mapData.chessboard.init) {
    if (!isPositionString(posString)) continue
    const id = mapData.chessboard.init[posString]
    const card = mapData.cards.filter((card) => card.id === id)
    if (card.length !== 1) continue
    API.setChess(chessboard, parsePosition(posString), createChess(card[0], totalChess++))
  }
  return [chessboard, totalChess]
}
