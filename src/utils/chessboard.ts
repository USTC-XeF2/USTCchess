import type {
  Card,
  Chess,
  Chessboard,
  ChessboardSetting,
  Direction,
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

const directionOffsets: Position[] = [
  [-1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, -1]
]

export const API = {
  canEat(camp1: number, camp2: number): boolean {
    return camp1 !== 0 && camp2 !== 0 && camp1 !== camp2
  },
  getNewPos(pos: Position, direction: Direction, multiplier: number = 1): Position {
    const offset = directionOffsets[direction - 1]
    return [pos[0] + offset[0] * multiplier, pos[1] + offset[1] * multiplier]
  },
  checkCondition(condition: string, pos: Position): boolean {
    const variables = {
      row: pos[0],
      col: pos[1]
    }
    const expression = condition.replace(/(\w+)/g, (match) => {
      return typeof variables[match] !== 'undefined' ? variables[match] : match
    })
    try {
      return Function(`return ${expression}`)()
    } catch {
      return false
    }
  },
  createChess(card: Card): Chess {
    const chess = JSON.parse(JSON.stringify(card))
    if (!chess.attr) chess.attr = {}
    return chess
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
  traverseMoveRanges(
    chessboard: Chessboard,
    pos: Position,
    callback: (pos: Position, direction: Direction, step: number) => boolean
  ): void {
    const chess = API.getChess(chessboard, pos)
    if (!chess) return
    for (const moveRange of chess.moveRanges) {
      const maxStep = moveRange.maxstep === -1 ? Infinity : moveRange.maxstep || 1
      for (let step = 1; step <= maxStep; step++) {
        const newPos = API.getNewPos(pos, moveRange.direction, step)
        if (!API.isInChessboard(chessboard, newPos)) break
        if (callback(newPos, moveRange.direction, step)) break
      }
    }
  },
  moveChess(chessboard: Chessboard, from: Position, to: Position): Chess | null {
    return API.setChess(chessboard, to, API.setChess(chessboard, from, null))
  }
}
