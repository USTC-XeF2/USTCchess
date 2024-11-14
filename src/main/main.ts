import { app, BrowserWindow, dialog, shell } from 'electron'
import { basename, extname, join } from 'node:path'
import { promises as fsPromises } from 'node:fs'
import { is } from '@electron-toolkit/utils'
import semver from 'semver'

import type { Map, VersionRanges } from '../types/map'
import { Extension, ExtensionInfo } from '../types/extension'
import type { Settings } from '../types/settings'
import { isMap } from '../utils/map'
import { getInfo, isExtension } from '../utils/extension'
import { defaultSettings } from '../utils/settings'

const basePath = join(app.getPath('userData'), 'Local Storage')
const lastLoadedPath = join(basePath, 'last-loaded.json')
const settingPath = join(basePath, 'settings.json')

export function createMainWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 960,
    height: 640,
    minWidth: 720,
    minHeight: 480,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    icon: join(__dirname, '../../resources/icon.png'),
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

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/main.html`)
  } else {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.control && input.key.toLowerCase() === 'r') {
        event.preventDefault()
      }
    })
    mainWindow.loadFile(join(__dirname, '../renderer/main.html'))
  }
  return mainWindow
}

export async function getLastLoaded(): Promise<object> {
  try {
    const data = await fsPromises.readFile(lastLoadedPath)
    return JSON.parse(data.toString())
  } catch {
    return {}
  }
}

export async function changeLastLoaded(key: string, value: unknown): Promise<void> {
  try {
    const lastLoaded = await getLastLoaded()
    await fsPromises.writeFile(lastLoadedPath, JSON.stringify({ ...lastLoaded, [key]: value }))
  } catch {
    // pass
  }
}

export async function analyzeMap(filePath: string): Promise<Map> {
  const data = JSON.parse(await fsPromises.readFile(filePath, 'utf-8'))
  if (isMap(data)) {
    return data
  } else {
    throw new Error('The map file information is incomplete.')
  }
}

export async function getExtensions(): Promise<Extension[]> {
  const extensionPath = await getSetting('extensions-save-path')
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
    for (const path of files) {
      if (extname(path) !== '.js') continue
      const modulePath = join(extensionPath, path)
      try {
        delete require.cache[require.resolve(modulePath)]
      } catch {
        // pass
      }
      try {
        const module = require(modulePath)
        if (isExtension(module)) extensions.push(module)
      } catch {
        // pass
      }
    }
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
    const lastLoaded = await getLastLoaded()
    return lastLoaded['enabled-extensions'] || []
  } catch {
    return []
  }
}

export async function setEnabledExtensions(
  enabledExtensions: ExtensionInfo['key'][]
): Promise<void> {
  try {
    await changeLastLoaded('enabled-extensions', enabledExtensions)
  } catch {
    throw new Error('Failed to write enabled extensions to file.')
  }
}

export async function importExtensions(mainWindow: BrowserWindow): Promise<void> {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '导入扩展',
    buttonLabel: '导入',
    filters: [
      { name: 'JavaScript Files', extensions: ['js'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['multiSelections']
  })
  const extensionPath = await getSetting('extensions-save-path')
  await Promise.all(
    result.filePaths.map((filePath) =>
      fsPromises.copyFile(filePath, join(extensionPath, basename(filePath)))
    )
  )
}

export async function autoGetNeededExtensions(
  neededExtensions: VersionRanges
): Promise<Extension[]> {
  const enableFlag = await getSetting('auto-enable-extensions')
  let extList: ExtensionInfo['key'][] = []
  if (enableFlag) {
    extList = Object.keys(neededExtensions)
  } else {
    extList = await getEnabledExtensions()
  }
  return (await getExtensions()).filter((extension) => extList.includes(extension.key))
}

export function checkExtensions(
  extensions: ExtensionInfo[],
  neededExtensions: VersionRanges
): boolean {
  for (const [key, versionRange] of Object.entries(neededExtensions)) {
    const extension = extensions.find((ext) => ext.key === key)
    if (!(extension && semver.satisfies(extension.version, versionRange))) {
      return false
    }
  }
  return true
}

export async function getSettings(): Promise<Settings> {
  let settings: Settings
  try {
    const data = await fsPromises.readFile(settingPath)
    settings = { ...defaultSettings, ...JSON.parse(data.toString()) }
  } catch {
    settings = defaultSettings
  }
  if (!settings['extensions-save-path']) {
    settings['extensions-save-path'] = join(basePath, 'extensions')
  }
  return settings
}

export async function getSetting<T extends keyof Settings>(key: T): Promise<Settings[T]> {
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

export async function changeSettings(changedSettings: Partial<Settings>): Promise<void> {
  try {
    const newSettings = { ...(await getSettings()), ...changedSettings }
    await fsPromises.writeFile(settingPath, JSON.stringify(newSettings))
  } catch (error) {
    throw new Error('Failed to change settings.')
  }
}

export async function openExtensionFolder(): Promise<void> {
  shell.openPath(await getSetting('extensions-save-path'))
}

export async function chooseExtensionFolder(mainWindow: BrowserWindow): Promise<void> {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择扩展存储路径',
    defaultPath: await getSetting('extensions-save-path'),
    buttonLabel: '选择',
    properties: ['openDirectory']
  })
  if (result.canceled) return
  await changeSettings({ 'extensions-save-path': result.filePaths[0] })
}
