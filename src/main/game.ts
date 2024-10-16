import { BrowserWindow, dialog, ipcMain, IpcMainInvokeEvent, Menu, shell } from 'electron'
import { join } from 'node:path'
import { RawData, WebSocket } from 'ws'
import { is } from '@electron-toolkit/utils'

import { Map as GameMap } from '../types/map'

import { Response } from '../types/net'

function createGameWindow(): BrowserWindow {
  const gameWindow = new BrowserWindow({
    width: 360,
    height: 600,
    resizable: false,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js')
    }
  })

  const menu = Menu.buildFromTemplate([
    {
      label: '游戏',
      submenu: [
        { label: '查看地图信息' },
        { type: 'separator' },
        {
          label: '退出',
          click: (): void => {
            gameWindow.close()
          }
        }
      ]
    },
    {
      label: '操作',
      submenu: [
        { label: '悔棋' },
        { label: '撤销悔棋' },
        { type: 'separator' },
        { label: '显示行走提示' }
      ]
    }
  ])

  gameWindow.setMenu(menu)

  gameWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    gameWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/game.html`)
  } else {
    gameWindow.loadFile(join(__dirname, '../renderer/game.html'))
  }
  return gameWindow
}

class GameClient {
  id: number
  window: BrowserWindow
  // WebSocket
  private ws: WebSocket
  private close: () => void
  private timeout: number
  private isConnectSuccess: boolean = false
  private messageHandlers: Map<string, (response: Response) => void> = new Map()
  // Game
  private turn: number = 0
  private mapData: GameMap | null = null
  constructor(address: string, close: () => void, timeout: number = 5000) {
    this.close = close
    this.timeout = timeout
    this.ws = new WebSocket(`ws://${address}`)
    this.ws.on('message', this.onMessage.bind(this))
    this.window = createGameWindow()
    this.id = this.window.webContents.id
    setTimeout(() => {
      if (!this.isConnectSuccess) {
        dialog.showErrorBox('错误', '连接超时')
        this.ws.close()
        this.close()
      }
    }, this.timeout)
  }

  private initialGame(turn: number, mapData: GameMap): void {
    this.turn = turn
    this.mapData = mapData as GameMap
    this.window.on('ready-to-show', () => {
      this.window.show()
    })
  }

  private onMessage(rawData: RawData): void {
    let data: { type: string; data?: unknown; id?: string }
    try {
      data = JSON.parse(rawData.toString())
    } catch {
      console.error('Invalid Response:', rawData)
      return
    }

    if (data.id && this.messageHandlers.has(data.id)) {
      const handler = this.messageHandlers.get(data.id)
      if (handler) {
        handler({ status: data.type, data: data.data })
      }
    } else {
      switch (data.type) {
        case 'connect-success': {
          const { turn, mapData } = data.data as { turn: number; mapData: GameMap }
          this.initialGame(turn, mapData)
          this.isConnectSuccess = true
          break
        }
        case 'connect-fail':
          if (data.data === 'too-many-clients') {
            dialog.showErrorBox('错误', '游戏房间已满')
          } else {
            dialog.showErrorBox('错误', data.data as string)
          }
          this.ws.close()
          this.close()
          break
        default:
          dialog.showErrorBox('错误', `消息类型 ${data.type} 不存在`)
      }
    }
  }

  contact(type: string, data?: unknown): Promise<Response> {
    return new Promise((resolve) => {
      switch (type) {
        case 'get-turn':
          resolve({ status: 'success', data: this.turn })
          break
        case 'get-map':
          if (this.mapData) {
            resolve({ status: 'success', data: this.mapData })
          } else {
            this.contactToServer('get-map').then(resolve)
          }
          break
        default:
          this.contactToServer(type, data).then(resolve)
      }
    })
  }

  contactToServer(type: string, data?: unknown): Promise<Response> {
    return new Promise((resolve) => {
      const messageId = Math.random().toString(36).substring(2)
      const message = JSON.stringify({ type, data, id: messageId })

      const onResponse = (response: Response): void => {
        this.messageHandlers.delete(messageId)
        resolve(response)
      }

      this.messageHandlers.set(messageId, onResponse)
      this.ws.send(message)

      // 可选：设置超时处理
      setTimeout(() => {
        if (this.messageHandlers.has(messageId)) {
          this.messageHandlers.delete(messageId)
          resolve({ status: 'error', data: 'Timeout waiting for response' })
        }
      }, this.timeout)
    })
  }
}

export const checkOnClose = (): Promise<boolean> => {
  return new Promise((resolve) => {
    dialog
      .showMessageBox({
        type: 'warning',
        buttons: ['确定', '取消'],
        cancelId: 1,
        title: '关闭游戏',
        message: '游戏正在运行中，确定要退出游戏吗？'
      })
      .then((res) => {
        resolve(!res.response)
      })
  })
}

export function createClients(address: string, clientCount: number, stopGame: () => void): void {
  const gameClients = Array.from({ length: clientCount }, () => new GameClient(address, stopGame))
  ipcMain.handle('contact', (_e: IpcMainInvokeEvent, type: string, data: unknown) => {
    return new Promise((resolve, reject) => {
      for (const c of gameClients) {
        if (c.id === _e.sender.id) {
          c.contact(type, data).then(resolve)
          return
        }
      }
      reject('The window is not a game window.')
    })
  })
  for (const c of gameClients) {
    c.window.on('close', (e) => {
      e.preventDefault()
      checkOnClose().then((res) => {
        if (res) {
          for (const c of gameClients) {
            c.window.destroy()
          }
          ipcMain.removeHandler('contact')
          stopGame()
        }
      })
    })
  }
}
