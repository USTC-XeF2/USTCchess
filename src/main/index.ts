import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent, shell } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'

import { Map } from '../types/map'
import { generateChessboard } from '../utils/map'

import {
  extensionPath,
  createMainWindow,
  analyzeMap,
  getExtensions,
  getEnabledExtensions,
  setEnabledExtensions,
  getSettings,
  getSetting,
  changeSettings
} from './main'

import { createGameWindow } from './game'

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
  let gameWindow: BrowserWindow | null = null

  function startGame(_e: IpcMainInvokeEvent, gamemode: string, mapData: Map): Promise<string> {
    return new Promise((resolve) => {
      if (gamemode == 'single') {
        if (gameWindow) return resolve('The game is running.')
        getSetting(_e, 'auto-minimize-mainwindow').then((flag) => {
          if (flag) mainWindow.minimize()
        })
        gameWindow = createGameWindow(mainWindow)
        ipcMain.handle('get-map-data', () => {
          return new Promise((resolve) => {
            resolve(mapData)
          })
        })
        gameWindow.on('closed', () => {
          mainWindow.webContents.send('stop-game')
          if (mainWindow.isMinimized()) mainWindow.restore()
          ipcMain.removeHandler('get-map-data')
          gameWindow = null
        })
        resolve('success')
      } else {
        resolve(`The gamemode '${gamemode}' has not been implemented yet.`)
      }
    })
  }

  ipcMain.handle('start-game', startGame)
  ipcMain.handle('analyze-map', analyzeMap)
  ipcMain.handle('get-extensions', getExtensions)
  ipcMain.handle('get-enabled-extensions', getEnabledExtensions)
  ipcMain.handle('set-enabled-extensions', setEnabledExtensions)
  ipcMain.on('open-extension-folder', () => {
    shell.openPath(extensionPath)
  })
  ipcMain.handle('get-settings', getSettings)
  ipcMain.handle('get-setting', getSetting)
  ipcMain.handle('change-settings', changeSettings)
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
    e.returnValue = generateChessboard(mapData)
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
