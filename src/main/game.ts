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

  gameWindow.on('ready-to-show', () => {
    gameWindow.show()
  })

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
          this.turn = turn
          this.mapData = mapData
          this.window.webContents.send('connect-success')
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
        case 'game-start':
          this.window.webContents.send(data.type)
          break
        default:
          dialog.showErrorBox('错误', `消息类型 ${data.type} 不存在`)
      }
    }
  }

  contact(type: string, data?: unknown): Promise<Response> {
    return new Promise((resolve) => {
      switch (type) {
        case 'get-info':
          if (this.turn && this.mapData) {
            resolve({ status: 'success', data: { turn: this.turn, mapData: this.mapData } })
          } else {
            resolve({ status: 'error', data: 'Fail to get info.' })
          }
          break
        case 'get-state':
          this.contactToServer(type, data).then(resolve)
          break
        default:
          resolve({ status: 'error', data: 'Unknown type.' })
      }
    })
  }

  contactToServer(type: string, data?: unknown): Promise<Response> {
    return new Promise((resolve) => {
      const messageId = Math.random().toString(36).substring(2)
      try {
        const message = JSON.stringify({ type, data, id: messageId })
        this.messageHandlers.set(messageId, (response: Response): void => {
          this.messageHandlers.delete(messageId)
          resolve(response)
        })
        this.ws.send(message)
      } catch {
        resolve({ status: 'error', data: 'Failed to send message.' })
      }

      setTimeout(() => {
        if (this.messageHandlers.has(messageId)) {
          this.messageHandlers.delete(messageId)
          resolve({ status: 'error', data: 'Timeout waiting for response.' })
        }
      }, this.timeout)
    })
  }
}

export const checkOnClose = async (): Promise<boolean> => {
  const res = await dialog.showMessageBox({
    type: 'warning',
    buttons: ['确定', '取消'],
    cancelId: 1,
    title: '关闭游戏',
    message: '游戏正在运行中，确定要退出游戏吗？'
  })
  return res.response === 0
}

export function createClients(
  address: string,
  clientCount: number,
  title: string,
  stopGame: () => void
): void {
  const gameClients = Array.from({ length: clientCount }, () => new GameClient(address, stopGame))
  ipcMain.handle('contact', async (_e: IpcMainInvokeEvent, type: string, data: unknown) => {
    for (const c of gameClients) {
      if (c.id === _e.sender.id) return await c.contact(type, data)
    }
    throw new Error('The window is not a game window.')
  })
  for (const c of gameClients) {
    c.window.setTitle(`USTC棋-${title}`)
    c.window.on('close', async (e) => {
      e.preventDefault()
      const res = await checkOnClose()
      if (res) {
        for (const c of gameClients) {
          c.window.destroy()
        }
        ipcMain.removeHandler('contact')
        stopGame()
      }
    })
  }
}
