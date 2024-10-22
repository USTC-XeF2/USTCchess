import { app, BrowserWindow, IpcMainInvokeEvent, shell } from 'electron'
import { extname, join } from 'node:path'
import { promises as fsPromises } from 'node:fs'
import { is } from '@electron-toolkit/utils'

import type { Map } from '../types/map'
import { Extension, ExtensionInfo } from '../types/extension'
import type { Settings } from '../types/settings'
import { isMap } from '../utils/map'
import { getInfo, isExtension } from '../utils/extension'
import { defaultSettings } from '../utils/settings'

let basePath: string
if (is.dev) {
  basePath = app.getAppPath()
} else {
  basePath = join(app.getPath('exe'), '../')
}

export const settingPath = join(basePath, './settings.json')
export const extensionPath = join(basePath, './extensions')
export const extensionConfigPath = join(extensionPath, 'enabled.json')

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

export async function analyzeMap(_e: IpcMainInvokeEvent, text: string): Promise<Map> {
  try {
    const data = JSON.parse(text)
    if (isMap(data)) {
      return data
    } else {
      throw new Error('The map file information is incomplete.')
    }
  } catch {
    throw new Error('The format of the file is incorrect.')
  }
}

export async function getExtensions(): Promise<Extension[]> {
  try {
    await fsPromises.access(extensionPath)
  } catch {
    try {
      await fsPromises.mkdir(extensionPath)
      return []
    } catch {
      throw new Error('Failed to create folder.')
    }
  }
  try {
    const files = await fsPromises.readdir(extensionPath)
    const extensions: Extension[] = []
    const promises = files.map(async (path) => {
      if (extname(path) === '.js') {
        const module = await import(`file://${join(extensionPath, path)}`)
        if (isExtension(module)) {
          extensions.push(module)
        }
      }
    })
    await Promise.all(promises)
    return extensions
  } catch {
    throw new Error('Failed to read folder or import modules.')
  }
}

export async function getExtensionsInfo(): Promise<ExtensionInfo[]> {
  return (await getExtensions()).map((extension) => getInfo(extension))
}

export async function getEnabledExtensions(): Promise<ExtensionInfo['key'][]> {
  try {
    const data = await fsPromises.readFile(extensionConfigPath)
    return JSON.parse(data.toString())
  } catch {
    return []
  }
}

export async function setEnabledExtensions(
  _e: IpcMainInvokeEvent,
  enabledExtensions: ExtensionInfo['key'][]
): Promise<void> {
  try {
    await fsPromises.writeFile(extensionConfigPath, JSON.stringify(enabledExtensions))
  } catch {
    throw new Error('Failed to write enabled extensions to file.')
  }
}

export async function getSettings(): Promise<Settings> {
  try {
    const data = await fsPromises.readFile(settingPath)
    return { ...defaultSettings, ...JSON.parse(data.toString()) }
  } catch {
    return defaultSettings
  }
}

export async function getSetting<T extends keyof Settings>(
  _e: IpcMainInvokeEvent,
  key: T
): Promise<Settings[T]> {
  try {
    const settings = await getSettings()
    if (key in settings) {
      return settings[key]
    } else {
      throw new Error(`The setting "${key}" does not exist.`)
    }
  } catch {
    throw new Error('Failed to get setting.')
  }
}

export async function changeSettings(
  _e: IpcMainInvokeEvent,
  changedSettings: Partial<Settings>
): Promise<Settings> {
  try {
    const settings = await getSettings()
    const newSettings = { ...settings, ...changedSettings }
    await fsPromises.writeFile(settingPath, JSON.stringify(newSettings))
    return newSettings
  } catch (error) {
    throw new Error('Failed to change settings.')
  }
}
