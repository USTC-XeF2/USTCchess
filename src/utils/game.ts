import { Card, Chess, Chessboard, Position } from '../types/chessboard'
import { Map } from '../types/map'
import { Extension } from '../types/extension'
import { API } from './chessboard'

export class GameData {
  protected mapData: Map | null = null
  protected extensions: Extension[] = []
  protected chessboard: Chessboard = []
  initialExtensions(createChess: ((card: Card) => Chess) | null = null): void {
    const extensionAPI = {
      ...API,
      cards: this.mapData?.cards,
      onChessDeath: this.onChessDeath.bind(this),
      createChess: createChess,
      endGame: this.endGame.bind(this)
    }
    for (const ext of this.extensions) {
      ext.API = extensionAPI
      try {
        ext.init?.()
      } catch {
        // pass
      }
    }
  }

  getAvailableMoves(pos: Position): Position[] {
    const chess = API.getChess(this.chessboard, pos)
    if (!chess) return []
    const availableMoves: Position[] = []
    // 由moveRanges定义的移动范围
    for (const moveRange of chess.moveRanges) {
      for (let step = 1; step <= (moveRange.maxstep || 1); step++) {
        const newPos = API.getNewPos(pos, API.getDirectionOffset(moveRange.direction), step)
        if (!API.isInChessboard(this.chessboard, newPos)) break
        const targetChess = API.getChess(this.chessboard, newPos)
        if (targetChess && !API.canEat(chess.camp, targetChess.camp)) break
        availableMoves.push(newPos)
      }
    }
    // 由扩展修改的移动范围
    for (const ext of this.extensions) {
      try {
        ext.onMove?.(this.chessboard, pos, availableMoves)
      } catch {
        // pass
      }
    }
    return availableMoves
  }

  onChessDeath(pos: Position, oldChess: Chess): void {
    if (oldChess.isChief) this.endGame(oldChess.camp === 1 ? 2 : 1)
    for (const ext of this.extensions) {
      try {
        ext.onDeath?.(this.chessboard, pos, oldChess)
      } catch {
        //pass
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  endGame(_winner: number, _info?: string): void {
    // pass
  }
}
