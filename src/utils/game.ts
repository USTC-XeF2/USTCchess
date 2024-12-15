import { Chess, Chessboard, Position } from '../types/chessboard'
import { Map } from '../types/map'
import { Extension } from '../types/extension'
import { API } from './chessboard'

export class GameData {
  protected mapData: Map | null = null
  protected extensions: Extension[] = []
  protected chessboard: Chessboard = []
  loadExtensions(extensions: Extension[]): void {
    const extensionAPI = {
      ...API,
      cards: this.mapData?.cards,
      onChessDeath: this.onChessDeath.bind(this),
      endGame: this.endGame.bind(this)
    }
    for (const ext of extensions) {
      ext.API = extensionAPI
      try {
        ext.init?.()
      } catch {
        // pass
      }
    }
    this.extensions = extensions
  }

  getAvailableMoves(pos: Position): Position[] {
    const chess = API.getChess(this.chessboard, pos)
    if (!chess) return []
    const availableMoves: Position[] = []
    API.traverseMoveRanges(this.chessboard, pos, (newPos) => {
      const targetChess = API.getChess(this.chessboard, newPos)
      if (targetChess && !API.canEat(chess.camp, targetChess.camp)) return true
      availableMoves.push(newPos)
      return Boolean(targetChess)
    })
    for (const ext of this.extensions) {
      try {
        ext.modifyMove?.(this.chessboard, pos, availableMoves)
      } catch {
        // pass
      }
    }
    const set = new Set(availableMoves.map((p) => JSON.stringify(p)))
    availableMoves.length = 0
    for (const p of set) {
      availableMoves.push(JSON.parse(p))
    }
    return availableMoves
  }

  afterMove(from: Position, to: Position, turn: number): void {
    for (const ext of this.extensions) {
      try {
        ext.afterMove?.(this.chessboard, from, to, turn)
      } catch {
        // pass
      }
    }
  }

  onChessDeath(pos: Position, oldChess: Chess): void {
    if (oldChess.isChief) this.endGame(oldChess.camp === 1 ? 2 : 1)
    for (const ext of this.extensions) {
      try {
        ext.onDeath?.(this.chessboard, pos, oldChess)
      } catch {
        // pass
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  endGame(_winner: number, _info?: string): void {
    // pass
  }
}
