import { BrowserWindow, Menu, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

export function createGameWindow(mainWindow: BrowserWindow): BrowserWindow {
  const gameWindow = new BrowserWindow({
    parent: mainWindow,
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
