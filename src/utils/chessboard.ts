import type {
  Card,
  Chess,
  Chessboard,
  ChessboardSetting,
  MoveRange,
  Position,
  PositionString
} from '../types/chessboard'

function isMoveRange(obj): obj is MoveRange {
  return (
    typeof obj.direction === 'number' &&
    obj.direction >= 1 &&
    obj.direction <= 8 &&
    (typeof obj.maxstep === 'number' || obj.maxstep === undefined)
  )
}

export function isCard(obj): obj is Card {
  return (
    typeof obj.id === 'number' &&
    typeof obj.name === 'string' &&
    typeof obj.camp === 'number' &&
    Array.isArray(obj.moveRanges) &&
    obj.moveRanges.every((v) => isMoveRange(v)) &&
    (typeof obj.isChief === 'boolean' || obj.isChief === undefined)
  )
}

export function isPositionString(str: string): str is PositionString {
  return /^\[\d+,\d+\]$/.test(str.replace(/\s/g, ''))
}

export function isChessboardSetting(obj): obj is ChessboardSetting {
  return (
    typeof obj.width === 'number' &&
    typeof obj.height === 'number' &&
    typeof obj.intersection === 'boolean' &&
    typeof obj.init === 'object' &&
    Array.isArray(Object.values(obj.init)) &&
    Object.values(obj.init).every((v) => typeof v === 'number')
  )
}

export function parsePosition(posString: PositionString): Position {
  return JSON.parse(posString)
}

export function createChess(card: Card, id: number): Chess {
  return { ...JSON.parse(JSON.stringify(card)), chessID: id }
}

export const API = {
  canEat(camp1: number, camp2: number): boolean {
    return camp1 !== 0 && camp2 !== 0 && camp1 !== camp2
  },
  getDirectionOffset(direction: number): Position {
    const offsets: Position[] = [
      [-1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
      [1, 0],
      [1, -1],
      [0, -1],
      [-1, -1]
    ]
    return offsets[direction - 1]
  },
  getNewPos(pos: Position, offset: Position, multiplier: number = 1): Position {
    return [pos[0] + offset[0] * multiplier, pos[1] + offset[1] * multiplier]
  },
  isInChessboard(chessboard: Chessboard, pos: Position): boolean {
    return pos[0] >= 0 && pos[0] < chessboard.length && pos[1] >= 0 && pos[1] < chessboard[0].length
  },
  getChess(chessboard: Chessboard, pos: Position): Chess | null {
    return chessboard[pos[0]][pos[1]]
  },
  setChess(chessboard: Chessboard, pos: Position, chess: Chess | null): Chess | null {
    if (!API.isInChessboard(chessboard, pos)) return null
    const oldChess = API.getChess(chessboard, pos)
    chessboard[pos[0]][pos[1]] = chess
    return oldChess
  },
  moveChess(chessboard: Chessboard, from: Position, to: Position): Chess | null {
    return API.setChess(chessboard, to, API.setChess(chessboard, from, null))
  }
}
