// 1-8 代表从正上方开始顺时针旋转的八个方向
export type Direction = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export interface MoveRange {
  direction: Direction
  maxstep?: number
}

export interface Card {
  id: number
  name: string
  camp: number
  moveRanges: MoveRange[]
  isChief?: boolean
  attr?: object
}

export type Position = [number, number]

export type PositionString = `[${number},${number}]`

export interface Chess extends Card {
  attr: object
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
