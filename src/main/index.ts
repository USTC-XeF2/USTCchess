import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'

import { Map } from '../types/map'
import { generateChessboard } from '../utils/map'

import {
  extensionPath,
  createMainWindow,
  analyzeMap,
  getExtensionsInfo,
  getEnabledExtensions,
  setEnabledExtensions,
  autoGetNeededExtensions,
  checkExtensions,
  getSettings,
  getSetting,
  changeSettings
} from './main'

import { GameServer, getUnusedPort } from './game-server'
import { checkOnClose, createClients } from './game'

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.xef2.ustcchess')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  let mainWindow = createMainWindow()
  let isGameRunning: boolean = false

  const restoreMainWindow = (): void => {
    if (isGameRunning) {
      mainWindow.webContents.send('stop-game')
      if (mainWindow.isMinimized()) mainWindow.restore()
      isGameRunning = false
    }
  }

  mainWindow.on('close', (e) => {
    if (!isGameRunning) return
    e.preventDefault()
    checkOnClose().then((res) => {
      if (res) {
        BrowserWindow.getAllWindows().forEach((w) => w.destroy())
      }
    })
  })

  async function startGame(gamemode: string, mapData: Map): Promise<string> {
    if (isGameRunning) return '游戏正在运行中'
    if (gamemode === 'local-mode') {
      try {
        const extensions = await autoGetNeededExtensions(mapData.extensions)
        if (
          (await getSetting('check-extensions')) &&
          !checkExtensions(extensions, mapData.extensions)
        )
          return '地图所需扩展未启用或版本错误'
        const port = await getUnusedPort()
        const server = new GameServer(mapData, extensions, port)
        createClients(`localhost:${port}`, 2, '本地模式', () => {
          server.close()
          restoreMainWindow()
        })
      } catch {
        return 'Unknown error.'
      }
    } else {
      return `The gamemode '${gamemode}' has not been implemented yet.`
    }
    isGameRunning = true
    if (await getSetting('auto-minimize-mainwindow')) mainWindow.minimize()
    return ''
  }

  const ignoreFirstArg = (func) => {
    return (_e, ...args): unknown => func(...args)
  }

  ipcMain.handle('get-game-status', () => isGameRunning)
  ipcMain.handle('start-game', ignoreFirstArg(startGame))
  ipcMain.handle('analyze-map', ignoreFirstArg(analyzeMap))
  ipcMain.handle('get-extensions-info', getExtensionsInfo)
  ipcMain.handle('get-enabled-extensions', getEnabledExtensions)
  ipcMain.handle('set-enabled-extensions', ignoreFirstArg(setEnabledExtensions))
  ipcMain.handle('get-settings', getSettings)
  ipcMain.handle('get-setting', ignoreFirstArg(getSetting))
  ipcMain.handle('change-settings', ignoreFirstArg(changeSettings))
  ipcMain.on('open-extension-folder', () => {
    shell.openPath(extensionPath)
  })
  ipcMain.on('get-about', (e) => {
    e.returnValue = {
      'app-version': app.getVersion(),
      'electron-version': process.versions.electron,
      'chrome-version': process.versions.chrome,
      'node-version': process.versions.node,
      platform: process.platform,
      'sys-version': process.getSystemVersion()
    }
  })
  ipcMain.on('generate-chessboard', (e, mapData: Map) => {
    e.returnValue = generateChessboard(mapData)[0]
  })

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow()
    }
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
