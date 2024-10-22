import { randomInt } from 'node:crypto'
import { createServer } from 'node:net'
import { RawData, WebSocket, WebSocketServer } from 'ws'

import { Chessboard } from '../types/chessboard'
import { Map as GameMap } from '../types/map'
import { generateChessboard } from '../utils/map'

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

export class GameServer {
  private wss: WebSocketServer
  private playerList: Map<WebSocket, number> = new Map()
  private mapData: GameMap
  private chessboard: Chessboard
  private currentTurn: number = 0
  constructor(mapData: GameMap, port: number, openToLAN: boolean = false) {
    this.wss = new WebSocketServer({ port, host: openToLAN ? '0.0.0.0' : 'localhost' })
    this.mapData = mapData
    this.chessboard = generateChessboard(mapData)
    this.wss.on('connection', this.onConnection.bind(this))
  }

  send(ws: WebSocket, type: string, data?: unknown, id?: string): void {
    ws.send(JSON.stringify({ type, data, id }))
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
    this.send(ws, 'connect-success', { turn: this.wss.clients.size, mapData: this.mapData })
    if (this.wss.clients.size === 2) {
      this.start()
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
      default:
        this.send(ws, 'error', `Invalid type: ${data.type}`, data.id)
    }
  }

  start(): void {
    this.currentTurn = 1
    for (const ws of this.wss.clients) {
      this.send(ws, 'game-start')
    }
  }

  stop(): void {
    this.wss.close()
  }
}
