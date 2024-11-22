import { app, BrowserWindow, dialog, ipcMain, nativeTheme } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'

import { Position } from '../types/chessboard'
import { Map } from '../types/map'
import { Extension } from '../types/extension'
import { GameData as GameDataInterface } from '../types/game'
import { generateChessboard } from '../utils/map'
import { getInfo } from '../utils/extension'
import { GameData } from '../utils/game'

import {
  createMainWindow,
  getLastLoaded,
  changeLastLoaded,
  analyzeMap,
  getExtensionsInfo,
  getEnabledExtensions,
  setEnabledExtensions,
  importExtensions,
  autoGetNeededExtensions,
  checkExtensions,
  getSettings,
  getSetting,
  changeSettings,
  openExtensionFolder,
  chooseExtensionFolder
} from './main'

import { GameServer, getUnusedPort } from './game-server'
import { checkOnClose, createClients } from './game'

class PreloadGameData extends GameData {
  isAllExtLoaded: boolean = false
  async setMapData(mapData: Map): Promise<void> {
    this.mapData = mapData
    this.loadExtensions(await autoGetNeededExtensions(mapData.extensions))
    this.isAllExtLoaded = checkExtensions(this.extensions, mapData.extensions)
    this.chessboard = generateChessboard(mapData)
  }
  getInterface(): GameDataInterface {
    return {
      mapData: this.mapData,
      extensions: this.extensions.map((ext) => getInfo(ext)),
      chessboard: this.chessboard
    }
  }
  getExtensions(): Extension[] {
    return this.extensions
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.xef2.ustcchess')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  let mainWindow = createMainWindow()
  const gameData = new PreloadGameData()
  let isGameRunning: boolean = false

  mainWindow.on('maximize', () => mainWindow.webContents.send('window-maximize', true))
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('window-maximize', false))
  const controlWindow = (action: string): void => {
    switch (action) {
      case 'minimize':
        mainWindow.minimize()
        break
      case 'maximize':
        mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()
        break
      case 'close':
        mainWindow.close()
        break
    }
  }

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

  const getTheme = async (): Promise<{ isDark: boolean; primaryColor: string }> => {
    const settings = await getSettings()
    const theme = settings['theme']
    const isDark = theme === 'dark' || (theme === 'auto' && nativeTheme.shouldUseDarkColors)
    const primaryColor = settings['primary-color']
    return { isDark, primaryColor }
  }

  const updateConfig = (): void => {
    BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('update-config'))
  }
  nativeTheme.on('updated', updateConfig)

  const chooseMap = async (): Promise<boolean> => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: '选择地图',
      defaultPath: (await getLastLoaded())['last-loaded-map'],
      buttonLabel: '选择',
      properties: ['openFile'],
      filters: [
        { name: 'Map Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    if (canceled) return true
    try {
      gameData.setMapData(await analyzeMap(filePaths[0]))
      changeLastLoaded('last-loaded-map', filePaths[0])
      return true
    } catch {
      return false
    }
  }

  const getGameData = async (reload: boolean): Promise<GameDataInterface> => {
    if (reload) {
      const lastLoadedMap = (await getLastLoaded())['last-loaded-map']
      if (lastLoadedMap) {
        try {
          await gameData.setMapData(await analyzeMap(lastLoadedMap))
        } catch {
          // pass
        }
      }
    }
    return gameData.getInterface()
  }
  getGameData(true)

  const startGame = async (gamemode: string): Promise<string> => {
    if (isGameRunning) return '游戏正在运行中'
    if (gamemode === 'local-mode') {
      try {
        const mapData = gameData.getInterface().mapData
        if (!mapData) return '未选择地图文件'
        if ((await getSetting('check-extensions')) && !gameData.isAllExtLoaded)
          return '地图所需扩展未启用或版本错误'
        const port = await getUnusedPort()
        const server = new GameServer(mapData, gameData.getExtensions(), port)
        createClients(`localhost:${port}`, 2, mapData.name + '-本地模式', () => {
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

  ipcMain.handle('get-theme', getTheme)
  ipcMain.handle('get-game-status', () => isGameRunning)
  ipcMain.handle('start-game', ignoreFirstArg(startGame))
  ipcMain.handle('choose-map', chooseMap)
  ipcMain.handle('get-game-data', ignoreFirstArg(getGameData))
  ipcMain.handle('get-extensions-info', getExtensionsInfo)
  ipcMain.handle('get-enabled-extensions', getEnabledExtensions)
  ipcMain.handle('set-enabled-extensions', ignoreFirstArg(setEnabledExtensions))
  ipcMain.handle('import-extensions', () => importExtensions(mainWindow))
  ipcMain.handle('get-settings', getSettings)
  ipcMain.handle('get-setting', ignoreFirstArg(getSetting))
  ipcMain.handle('change-settings', ignoreFirstArg(changeSettings))
  ipcMain.handle('choose-extension-folder', () => chooseExtensionFolder(mainWindow))
  ipcMain.on('control-window', ignoreFirstArg(controlWindow))
  ipcMain.on('update-config', updateConfig)
  ipcMain.on('generate-chessboard', (e, mapData: Map) => {
    e.returnValue = generateChessboard(mapData)
  })
  ipcMain.on('get-available-moves', (e, pos: Position) => {
    e.returnValue = gameData.getAvailableMoves(pos)
  })
  ipcMain.on('open-extension-folder', openExtensionFolder)
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

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
