import os from 'os'
import dns from 'dns'
import { app, BrowserWindow, clipboard, dialog, ipcMain, nativeTheme } from 'electron'
import { FSWatcher, unwatchFile, watch, watchFile } from 'node:fs'
import { electronApp, optimizer } from '@electron-toolkit/utils'

import { Chess, Position } from '../types/chessboard'
import { Map } from '../types/map'
import { Extension } from '../types/extension'
import { GameData as GameDataInterface } from '../types/game'
import { getChessInfo } from '../utils/chessboard'
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
  copyExtensions,
  autoGetNeededExtensions,
  checkExtensions,
  getSettings,
  getSetting,
  changeSettings,
  openExtensionFolder
} from './main'

import { GameServer } from './game-server'
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

async function getLocalIPAddress(): Promise<string> {
  return new Promise((resolve, reject) => {
    dns.lookup(os.hostname(), 4, (e, address) => {
      if (e) reject(e)
      else resolve(address)
    })
  })
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
    checkOnClose(mainWindow).then((res) => {
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

  const reloadMap = async (): Promise<void> => {
    if (await getSetting('auto-reload-map')) mainWindow.webContents.send('update-map')
  }

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
      await gameData.setMapData(await analyzeMap(filePaths[0]))
      const originalPath = await changeLastLoaded('last-loaded-map', filePaths[0])
      if (originalPath) unwatchFile(originalPath, reloadMap)
      watchFile(filePaths[0], reloadMap)
      return true
    } catch {
      return false
    }
  }

  const getGameData = async (
    reload: boolean,
    watch: boolean = false
  ): Promise<GameDataInterface> => {
    if (reload) {
      const lastLoadedMap = (await getLastLoaded())['last-loaded-map']
      if (lastLoadedMap) {
        try {
          await gameData.setMapData(await analyzeMap(lastLoadedMap))
        } catch {
          // pass
        }
        if (watch) watchFile(lastLoadedMap, reloadMap)
      }
    }
    return gameData.getInterface()
  }
  getGameData(true, true)

  const importExtensions = async (): Promise<void> => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '导入扩展',
      buttonLabel: '导入',
      filters: [
        { name: 'JavaScript Files', extensions: ['js'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['multiSelections']
    })
    copyExtensions(result.filePaths)
  }

  const reloadExt = (): void => {
    reloadMap()
    mainWindow.webContents.send('update-extensions')
  }

  let watcher: FSWatcher | null = null
  const chooseExtensionFolder = async (): Promise<void> => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择扩展存储路径',
      defaultPath: await getSetting('extensions-save-path'),
      buttonLabel: '选择',
      properties: ['openDirectory']
    })
    if (result.canceled) return
    await changeSettings({ 'extensions-save-path': result.filePaths[0] })
    watcher?.close()
    reloadMap()
    watcher = watch(result.filePaths[0], reloadExt)
  }
  ;(async (): Promise<void> => {
    watcher = watch(await getSetting('extensions-save-path'), reloadExt)
  })()

  const startGame = async (
    gamemode: string,
    mode: string,
    data: { port: string; address: string }
  ): Promise<boolean> => {
    if (isGameRunning) throw '游戏正在运行中'
    const getMapData = async (): Promise<Map> => {
      const mapData = gameData.getInterface().mapData
      if (!mapData) throw '未选择地图文件'
      if ((await getSetting('check-extensions')) && !gameData.isAllExtLoaded)
        throw '地图所需扩展未启用或版本错误'
      return mapData
    }
    if (gamemode === 'local-mode') {
      const mapData = await getMapData()
      const server = new GameServer(mapData, gameData.getExtensions())
      createClients(server.address, 2, restoreMainWindow)
    } else if (gamemode === 'quick-online') {
      if (mode === 'create') {
        const mapData = await getMapData()
        const host = await getLocalIPAddress()
        const port = parseInt(data.port) || 0
        const server = new GameServer(mapData, gameData.getExtensions(), host, port)
        const isCopy = await dialog.showMessageBox(mainWindow, {
          type: 'info',
          buttons: ['复制地址', '确定'],
          defaultId: 1,
          title: '快速联机',
          message: `联机地址：${server.address}`,
          noLink: true
        })
        if (isCopy.response === 0) {
          clipboard.writeText(server.address)
        }
        createClients(server.address, 1, restoreMainWindow, false)
      } else {
        if (!data.address) throw '未输入联机地址'
        const regex = /^(([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}|(\d{1,3}\.){3}\d{1,3}):\d{1,5}$/
        if (!regex.test(data.address)) throw '地址格式错误'
        createClients(data.address, 1, restoreMainWindow, false)
      }
    } else {
      throw `The gamemode '${gamemode}' has not been implemented yet.`
    }
    isGameRunning = true
    if (await getSetting('auto-minimize-mainwindow')) mainWindow.minimize()
    return isGameRunning
  }

  const ipcHandles: Record<string, (...args) => unknown> = {
    'get-theme': getTheme,
    'get-game-status': (): boolean => isGameRunning,
    'start-game': startGame,
    'get-gamemode': async (m: string): Promise<string> => {
      if (m) changeLastLoaded('last-gamemode', m)
      const mode = m ?? (await getLastLoaded())['last-gamemode']
      return ['local-mode', 'quick-online'].includes(mode) ? mode : 'local-mode'
    },
    'choose-map': chooseMap,
    'get-game-data': getGameData,
    'get-extensions-info': getExtensionsInfo,
    'get-enabled-extensions': getEnabledExtensions,
    'set-enabled-extensions': async (l) => {
      await setEnabledExtensions(l)
      reloadMap()
    },
    'import-extensions': importExtensions,
    'get-settings': getSettings,
    'get-setting': getSetting,
    'change-settings': async (s) => {
      await changeSettings(s)
      if ('auto-reload-map' in s || 'auto-enable-extensions' in s) reloadMap()
    },
    'choose-extension-folder': chooseExtensionFolder
  }
  Object.entries(ipcHandles).forEach(([channel, handler]) =>
    ipcMain.handle(channel, (_e, ...args) => handler(...args))
  )

  ipcMain.on('control-window', (_e, action) => controlWindow(action))
  ipcMain.on('update-config', updateConfig)
  ipcMain.on('generate-chessboard', (e, mapData: Map) => {
    e.returnValue = generateChessboard(mapData)
  })
  ipcMain.on('show-chess-info', (e, chess: Chess, reverse: boolean = false) => {
    const window = BrowserWindow.fromWebContents(e.sender)
    if (window) {
      const [title, detail] = getChessInfo(chess, reverse)
      dialog.showMessageBox(window, {
        type: 'info',
        title: '棋子信息',
        message: title,
        detail: detail
      })
    }
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
