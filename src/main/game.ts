import { BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron'
import { join } from 'node:path'
import { RawData, WebSocket } from 'ws'
import { is } from '@electron-toolkit/utils'

import { autoGetNeededExtensions, checkExtensions } from './main'

import { Chessboard, Position } from '../types/chessboard'
import { Map as GameMap } from '../types/map'
import { Response } from '../types/net'
import { getInfo } from '../utils/map'
import { GameData } from '../utils/game'

function createGameWindow(getInfo: () => [string, string]): BrowserWindow {
  const gameWindow = new BrowserWindow({
    show: false,
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js')
    }
  })

  const menu = Menu.buildFromTemplate([
    {
      label: '游戏',
      submenu: [
        {
          label: '查看地图信息',
          click: (): void => {
            const [title, detail] = getInfo()
            dialog.showMessageBox({
              type: 'info',
              title: '地图信息',
              message: title,
              detail: detail
            })
          }
        },
        { type: 'separator' },
        {
          label: '退出游戏',
          click: (): void => {
            gameWindow.close()
          }
        }
      ]
    },
    {
      label: '操作',
      submenu: [{ label: '悔棋' }, { label: '撤销悔棋' }]
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

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    gameWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/game.html`)
  } else {
    gameWindow.loadFile(join(__dirname, '../renderer/game.html'))
  }
  return gameWindow
}

class GameClient extends GameData {
  id: number
  window: BrowserWindow
  // WebSocket
  private ws: WebSocket
  private close: (content?: string) => void
  private timeout: number
  private isConnectSuccess: boolean = false
  private messageHandlers: Map<string, (response: Response) => void> = new Map()
  // Game
  private camp: number = 0
  isGameEnd: boolean = false
  constructor(address: string, close: () => void, timeout: number = 5000) {
    super()
    this.ws = new WebSocket(`ws://${address}`)
    this.close = (content?): void => {
      if (content) dialog.showErrorBox('错误', content)
      this.ws.close()
      close()
    }
    this.timeout = timeout
    this.ws.on('message', this.onMessage.bind(this))
    this.window = createGameWindow(() => {
      if (this.mapData) {
        return getInfo(this.mapData)
      } else {
        return ['未获取到地图信息', '']
      }
    })
    this.id = this.window.webContents.id
    setTimeout(() => {
      if (!this.isConnectSuccess) {
        this.close('连接超时')
      }
    }, this.timeout)
  }

  private async onMessage(rawData: RawData): Promise<void> {
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
          const { camp, mapData } = data.data as { camp: number; mapData: GameMap }
          this.camp = camp
          this.mapData = mapData
          this.extensions = await autoGetNeededExtensions(this.mapData!.extensions)
          if (!checkExtensions(this.extensions, this.mapData!.extensions)) {
            this.close('地图所需扩展未启用或版本错误')
          }
          this.initialExtensions()
          this.window.webContents.send('connect-success')
          this.isConnectSuccess = true
          break
        }
        case 'connect-fail':
          if (data.data === 'too-many-clients') {
            this.close('游戏房间已满')
          } else {
            this.close(data.data as string)
          }
          break
        case 'game-start':
        case 'change-turn':
          this.window.webContents.send(data.type)
          break
        case 'game-end':
          this.isGameEnd = true
          this.window.webContents.send('game-end', data.data)
          break
        default:
          console.error('Unknown Response:', data)
      }
    }
  }

  async contact(type: string, data?: unknown): Promise<Response> {
    switch (type) {
      case 'get-info':
        if (this.camp && this.mapData) {
          return { status: 'success', data: { camp: this.camp, mapData: this.mapData } }
        } else {
          return { status: 'error', data: 'Fail to get info.' }
        }
      case 'get-state': {
        const res = await this.contactToServer(type, data)
        if (res.status === 'success') {
          if (res.data && typeof res.data === 'object' && 'chessboard' in res.data) {
            this.chessboard = (res.data as { chessboard: Chessboard }).chessboard
          }
        }
        return res
      }
      case 'get-available-moves':
        return { status: 'success', data: this.getAvailableMoves(data as Position) }
      case 'move':
        return await this.contactToServer(type, data)
      default:
        return { status: 'error', data: 'Unknown type.' }
    }
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
  ipcMain.handle('contact', async (_e, type: string, data: unknown) => {
    for (const c of gameClients) {
      if (c.id === _e.sender.id) return await c.contact(type, data)
    }
    throw new Error('The window is not a game window.')
  })
  for (const c of gameClients) {
    c.window.setTitle(title)
    c.window.on('close', async (e) => {
      e.preventDefault()
      if (c.isGameEnd || (await checkOnClose())) {
        for (const c of gameClients) {
          c.window.destroy()
        }
        ipcMain.removeHandler('contact')
        stopGame()
      }
    })
  }
}
