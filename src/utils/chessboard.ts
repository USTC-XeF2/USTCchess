import type {
  Card,
  Chess,
  Chessboard,
  ChessboardSetting,
  Position,
  PositionString
} from '../types/chessboard'

export function isCard(obj): obj is Card {
  return typeof obj.id === 'number' && typeof obj.name === 'string' && typeof obj.camp === 'number'
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

let totalChess = 0
export function createChess(card: Card): Chess {
  return { cardID: card.id, chessID: totalChess++ }
}

export function setChess(chessboard: Chessboard, pos: Position, chess: Chess): void {
  chessboard[pos[0]][pos[1]] = chess
}
