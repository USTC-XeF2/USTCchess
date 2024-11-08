import { randomInt } from 'node:crypto'
import { createServer } from 'node:net'
import { RawData, WebSocket, WebSocketServer } from 'ws'

import { Position } from '../types/chessboard'
import { Map as GameMap } from '../types/map'
import { Extension } from '../types/extension'
import { API, createChess } from '../utils/chessboard'
import { generateChessboard } from '../utils/map'
import { GameData } from '../utils/game'

export const getUnusedPort = async (maxTryTimes: number = 10): Promise<number> => {
  for (let i = 0; i < maxTryTimes; i++) {
    const port = randomInt(10000, 65535)
    const server = createServer()
    try {
      await new Promise<void>((resolve, reject) => {
        server.once('error', (err) => {
          server.close(() => reject(err))
        })
        server.once('listening', () => {
          server.close(() => resolve())
        })
        server.listen(port)
      })
      return port
    } catch {
      // pass
    }
  }
  throw new Error('Failed to find an unused port.')
}

export class GameServer extends GameData {
  // WebSocket
  private wss: WebSocketServer
  private playerList: Map<WebSocket, number> = new Map()
  // Game
  private ChessID: number
  private currentTurn: number = 0
  private isGameEnd: boolean = false
  constructor(mapData: GameMap, extensions: Extension[], port: number, openToLAN: boolean = false) {
    super()
    this.mapData = mapData
    this.extensions = extensions
    ;[this.chessboard, this.ChessID] = generateChessboard(mapData)
    this.wss = new WebSocketServer({ port, host: openToLAN ? '0.0.0.0' : 'localhost' })
    this.initialExtensions((card) => createChess(card, this.ChessID++))
    this.wss.on('connection', this.onConnection.bind(this))
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
    if (this.wss.clients.size > 2) {
      this.send(ws, 'connect-fail', 'too-many-clients')
      ws.close()
      return
    }
    this.playerList.set(ws, this.wss.clients.size)
    ws.on('message', (data) => this.processMsg(ws, data))
    ws.on('close', this.wss.close)
    this.send(ws, 'connect-success', { camp: this.wss.clients.size, mapData: this.mapData })
    if (this.wss.clients.size === 2) {
      this.startGame()
    }
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
      case 'get-state':
        this.send(
          ws,
          'success',
          { currentTurn: this.currentTurn, chessboard: this.chessboard },
          data.id
        )
        break
      case 'move': {
        if (this.playerList.get(ws) !== this.currentTurn) {
          this.send(ws, 'error', 'Not your turn', data.id)
          return
        }
        const [from, to] = data.data as Position[]
        const res = this.move(from, to)
        if (res) {
          this.currentTurn = 3 - this.currentTurn
          this.sendAll('change-turn')
          this.send(ws, 'success', undefined, data.id)
        }
        break
      }
      default:
        this.send(ws, 'error', `Invalid type: ${data.type}`, data.id)
    }
  }

  close(): void {
    this.wss.close()
  }

  startGame(): void {
    this.currentTurn = 1
    this.sendAll('game-start')
  }

  move(from: Position, to: Position): boolean {
    if (!this.currentTurn) return false
    const chess = API.getChess(this.chessboard, from)
    if (!chess || API.canEat(this.currentTurn, chess.camp)) return false
    const availableMoves = this.getAvailableMoves(from)
    if (!availableMoves.some((pos) => pos[0] === to[0] && pos[1] === to[1])) return false
    const oldChess = API.moveChess(this.chessboard, from, to)
    if (oldChess) this.onChessDeath(to, oldChess)
    return true
  }

  endGame(winner: number, info?: string): void {
    if (this.isGameEnd) return
    this.isGameEnd = true
    this.sendAll('game-end', { winner, info })
    this.close()
  }
}
