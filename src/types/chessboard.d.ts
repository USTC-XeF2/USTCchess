export interface Card {
  id: number
  name: string
  camp: number
}

export type Position = [number, number]

export type PositionString = `[${number},${number}]`

export interface Chess {
  cardID: number
  chessID: number
}

export type Chessboard = (Chess | null)[][]

export interface ChessboardSetting {
  width: number
  height: number
  intersection: boolean // 棋子是否位于交叉点
  init: {
    [key: PositionString]: Card['id']
  }
}
