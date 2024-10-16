import { randomInt } from 'node:crypto'
import { createServer } from 'node:net'
import { RawData, WebSocket, WebSocketServer } from 'ws'

import { Chessboard } from '../types/chessboard'
import { Map } from '../types/map'
import { generateChessboard } from '../utils/map'

export const getUnusedPort = async (maxTryTimes: number = 10): Promise<number> => {
  for (let i = 0; i < maxTryTimes; i++) {
    const port = randomInt(10000, 65535)
    const server = createServer()
    try {
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject)
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
  wss: WebSocketServer
  mapData: Map
  chessboard: Chessboard
  currentTurn: number = 0
  constructor(mapData: Map, port: number, openToLAN: boolean = false) {
    this.wss = new WebSocketServer({ port, host: openToLAN ? '0.0.0.0' : 'localhost' })
    this.mapData = mapData
    this.chessboard = generateChessboard(mapData)
    this.wss.on('connection', this.onConnection.bind(this))
  }

  send(ws: WebSocket, type: string, data?: unknown, id?: string): void {
    if (id) {
      ws.send(JSON.stringify({ type, data, id }))
    } else {
      ws.send(JSON.stringify({ type, data }))
    }
  }

  onConnection(ws: WebSocket): void {
    if (this.wss.clients.size > 2) {
      this.send(ws, 'connect-fail', 'too-many-clients')
      ws.close()
      return
    }
    ws.on('message', (data) => this.processMsg(ws, data))
    this.send(ws, 'connect-success', { turn: this.wss.clients.size, mapData: this.mapData })
  }

  processMsg(ws: WebSocket, rawData: RawData): void {
    let data: { type: string; data?: unknown; id?: string }
    try {
      data = JSON.parse(rawData.toString())
    } catch {
      this.send(ws, 'error', `Invalid data: ${rawData}`)
      return
    }
    switch (data.type) {
      case 'get-map':
        this.send(ws, 'success', this.mapData, data.id)
        break
      default:
        this.send(ws, 'error', `Invalid type: ${data.type}`, data.id)
    }
  }
}
