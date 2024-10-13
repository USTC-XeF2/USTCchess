import { app, BrowserWindow, IpcMainInvokeEvent, shell } from 'electron'
import { basename, extname, join } from 'node:path'
import { access, mkdir, readdir, readFile, writeFile } from 'node:fs'
import { is } from '@electron-toolkit/utils'

import type { Map } from '../types/map'
import { ExtensionInfo } from '../types/extension'
import type { Settings } from '../types/settings'
import { isMap } from '../utils/map'
import { defaultSettings } from '../utils/settings'

let basePath: string
if (is.dev) {
  basePath = app.getAppPath()
} else {
  basePath = join(app.getPath('exe'), '../')
}

export const settingPath = join(basePath, './settings.json')
export const extensionPath = join(basePath, './extensions')
export const extensionConfigPath = join(extensionPath, 'config.json')

export function createMainWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 960,
    height: 640,
    minWidth: 720,
    minHeight: 480,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js')
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/main.html`)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/main.html'))
  }
  return mainWindow
}

export function analyzeMap(_e: IpcMainInvokeEvent, text: string): Promise<Map> {
  return new Promise((resolve, reject) => {
    try {
      const data = JSON.parse(text)
      if (isMap(data)) {
        resolve(data)
      } else {
        reject('The map file information is incomplete.')
      }
    } catch {
      reject('The format of the file is incorrect.')
    }
  })
}

export function getExtensions(): Promise<ExtensionInfo[]> {
  return new Promise((resolve, reject) => {
    access(extensionPath, (err) => {
      if (err) {
        mkdir(extensionPath, (err) => {
          if (err) reject('Failed to create folder.')
          else resolve([])
        })
      } else {
        readdir(extensionPath, (err, files) => {
          if (err) return reject('Failed to read folder.')
          const extensions: ExtensionInfo[] = []
          files.forEach((path, index) => {
            if (extname(path) == '.js') {
              // The metadata of the extensions should be read here
              extensions.push({
                key: index.toString(),
                title: basename(path, '.js')
              })
            }
          })
          resolve(extensions)
        })
      }
    })
  })
}

function getExtensionConfig(): Promise<object> {
  return new Promise((resolve) => {
    readFile(extensionConfigPath, (err, data) => {
      if (err) {
        return resolve({})
      }
      try {
        resolve(JSON.parse(data.toString()))
      } catch {
        return resolve({})
      }
    })
  })
}

export function getEnabledExtensions(): Promise<ExtensionInfo['key'][]> {
  return new Promise((resolve) => {
    getExtensionConfig().then((config) => resolve(config['enabled-extensions']))
  })
}

export function setEnabledExtensions(
  _e: IpcMainInvokeEvent,
  enabledExtensions: ExtensionInfo['key'][]
): Promise<void> {
  return new Promise((resolve, reject) => {
    getExtensionConfig().then((config) => {
      config['enabled-extensions'] = enabledExtensions
      try {
        writeFile(extensionConfigPath, JSON.stringify(config), () => {})
        resolve()
      } catch {
        reject('Unknown error.')
      }
    })
  })
}

export function getSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    readFile(settingPath, (err, data) => {
      if (err) {
        return resolve(defaultSettings)
      }
      try {
        resolve({ ...defaultSettings, ...JSON.parse(data.toString()) })
      } catch {
        return resolve(defaultSettings)
      }
    })
  })
}

export function getSetting<T extends keyof Settings>(
  _e: IpcMainInvokeEvent,
  key: T
): Promise<Settings[T]> {
  return new Promise((resolve, reject) => {
    getSettings().then((settings) => {
      if (key in settings) {
        resolve(settings[key])
      } else {
        reject(`The setting "${key}" does not exist.`)
      }
    })
  })
}

export function changeSettings(
  _e: IpcMainInvokeEvent,
  changedSettings: Partial<Settings>
): Promise<Settings> {
  return new Promise((resolve, reject) =>
    getSettings().then((settings) => {
      const newSettings = { ...settings, ...changedSettings }
      try {
        writeFile(settingPath, JSON.stringify(newSettings), () => {})
        resolve(newSettings)
      } catch {
        reject('Unknown error.')
      }
    })
  )
}
