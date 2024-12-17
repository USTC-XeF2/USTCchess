import { randomInt } from 'crypto'
import { RawData, WebSocket, WebSocketServer } from 'ws'

import { Position } from '../types/chessboard'
import { Map as GameMap } from '../types/map'
import { Extension } from '../types/extension'
import { API } from '../utils/chessboard'
import { generateChessboard } from '../utils/map'
import { GameData } from '../utils/game'

export class GameServer extends GameData {
  address: string
  private wss: WebSocketServer
  private playerList: ({ client: WebSocket; prepared: boolean } | null)[]
  private currentTurn: number = 0
  private isGameEnd: boolean = false
  constructor(
    mapData: GameMap,
    extensions: Extension[],
    host: string = 'localhost',
    port: number = 0
  ) {
    super()
    let wss: WebSocketServer | null = null
    let retry = 10
    while (retry--) {
      try {
        port = port || randomInt(10000, 65536)
        wss = new WebSocketServer({ port, host })
        break
      } catch {
        port = 0
      }
    }
    if (!wss) throw new Error('Unable to get unused port')
    this.address = `${host}:${port}`
    this.wss = wss
    this.wss.on('connection', this.onConnection.bind(this))
    this.playerList = new Array(2).fill(null)
    this.mapData = mapData
    this.loadExtensions(extensions)
    this.chessboard = generateChessboard(mapData)
  }

  send(ws: WebSocket, type: string, data?: unknown, id?: string): void {
    ws.send(JSON.stringify({ type, data, id }))
  }

  sendAll(type: string, data?: unknown): void {
    for (const ws of this.wss.clients) {
      this.send(ws, type, data)
    }
  }

  onConnection(ws: WebSocket): void {
    const idx = this.playerList.findIndex((val) => !val)
    if (idx === -1) {
      this.send(ws, 'connect-fail', 'too-many-clients')
      ws.close()
      return
    }
    this.playerList[idx] = { client: ws, prepared: false }
    ws.on('message', (data) => this.processMsg(ws, data))
    ws.on('close', () => {
      if (this.playerList[idx]?.prepared) this.close()
      this.playerList[idx] = null
    })
    this.send(ws, 'connect-success', { camp: idx + 1, mapData: this.mapData })
  }

  processMsg(ws: WebSocket, rawData: RawData): void {
    let data: { type: string; data?: unknown; id?: string }
    try {
      data = JSON.parse(rawData.toString())
      if (!data || typeof data.type !== 'string') throw new Error()
    } catch {
      this.send(ws, 'error', `Invalid data: ${rawData}`)
      return
    }
    switch (data.type) {
      case 'prepared':
        if (
          this.playerList.every((val) => {
            if (val?.client === ws) val.prepared = true
            return val?.prepared
          })
        ) {
          this.currentTurn = 1
          this.sendAll('game-start')
        }
        break
      case 'get-state':
        this.send(
          ws,
          'success',
          { currentTurn: this.currentTurn, chessboard: this.chessboard },
          data.id
        )
        break
      case 'move': {
        if (this.playerList.findIndex((val) => val?.client === ws) + 1 !== this.currentTurn) {
          this.send(ws, 'error', 'Not your turn', data.id)
          break
        }
        try {
          const { from, to } = data.data as { from: Position; to: Position }
          const res = this.move(from, to)
          if (res) {
            this.sendAll('change-turn')
            this.send(ws, 'success', undefined, data.id)
          }
        } catch {
          this.send(ws, 'error', 'Invalid move', data.id)
        }
        break
      }
      default:
        this.send(ws, 'error', `Invalid type: ${data.type}`, data.id)
    }
  }

  close(): void {
    if (this.isGameEnd) return
    this.isGameEnd = true
    this.wss.clients.forEach((ws) => ws.close(4004))
    this.wss.close()
  }

  canMove(pos: Position, to?: Position): boolean {
    const chess = API.getChess(this.chessboard, pos)
    if (!chess || API.canEat(this.currentTurn, chess.camp)) return false
    const availableMoves = this.getAvailableMoves(pos)
    if (to) return availableMoves.some((p) => p[0] === to[0] && p[1] === to[1])
    return Boolean(availableMoves.length)
  }

  move(from: Position, to: Position): boolean {
    if (!this.currentTurn) return false
    if (!this.canMove(from, to)) return false
    const oldChess = API.moveChess(this.chessboard, from, to)
    if (oldChess) this.onChessDeath(to, oldChess)
    this.afterMove(from, to, this.currentTurn)
    this.currentTurn = 3 - this.currentTurn
    for (let i = 0; i < this.chessboard.length; i++) {
      for (let j = 0; j < this.chessboard[i].length; j++) {
        if (this.canMove([i, j])) return true
      }
    }
    this.endGame(this.currentTurn === 1 ? 2 : 1, '无可走棋子')
    return true
  }

  endGame(winner: number, info?: string): void {
    if (this.isGameEnd) return
    this.isGameEnd = true
    this.sendAll('game-end', { winner, info })
  }
}
