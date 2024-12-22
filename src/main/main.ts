import { app, BrowserWindow, shell } from 'electron'
import { basename, extname, join } from 'node:path'
import { promises as fsPromises } from 'node:fs'
import { is } from '@electron-toolkit/utils'
import semver from 'semver'

import type { Map, VersionRanges } from '../types/map'
import { Extension, ExtensionInfo, ExtNameList } from '../types/extension'
import { ItemType, ResourceItem, ResourceVersion } from '../types/resource'
import type { LastLoaded, Settings } from '../types/settings'
import { isMap } from '../utils/map'
import { getInfo, isExtension } from '../utils/extension'
import { defaultSettings } from '../utils/settings'

const basePath = join(app.getPath('userData'), 'Local Storage')
const lastLoadedPath = join(basePath, 'last-loaded.json')
const settingPath = join(basePath, 'settings.json')
const resourceHost = 'https://ustcchess.xef2.top'

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

export async function getLastLoaded(): Promise<LastLoaded> {
  try {
    const data = await fsPromises.readFile(lastLoadedPath)
    return JSON.parse(data.toString())
  } catch {
    return {}
  }
}

export async function changeLastLoaded<T extends keyof LastLoaded>(
  key: T,
  value: LastLoaded[T]
): Promise<LastLoaded[T]> {
  try {
    const lastLoaded = await getLastLoaded()
    const originalValue = lastLoaded[key]
    lastLoaded[key] = value
    await fsPromises.writeFile(lastLoadedPath, JSON.stringify(lastLoaded))
    return originalValue
  } catch {
    return undefined
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

export async function getEnabledExtensions(): Promise<ExtNameList> {
  try {
    const lastLoaded = await getLastLoaded()
    return lastLoaded['enabled-extensions'] || []
  } catch {
    return []
  }
}

export async function setEnabledExtensions(enabledExtensions: ExtNameList): Promise<void> {
  try {
    await changeLastLoaded('enabled-extensions', enabledExtensions)
  } catch {
    throw new Error('Failed to write enabled extensions to file.')
  }
}

export async function copyExtensions(paths: string[]): Promise<void> {
  const extensionPath = await getSetting('extensions-save-path')
  await Promise.all(
    paths.map((path) => fsPromises.copyFile(path, join(extensionPath, basename(path))))
  )
}

export async function autoGetNeededExtensions(
  neededExtensions: VersionRanges
): Promise<Extension[]> {
  const enableFlag = await getSetting('auto-enable-extensions')
  let enabledExtensions: ExtNameList = []
  if (enableFlag) {
    enabledExtensions = Object.keys(neededExtensions)
  } else {
    enabledExtensions = await getEnabledExtensions()
  }

  const selectedExtensions: Extension[] = []

  const groupedExtensions = (await getExtensions())
    .filter((extension) => enabledExtensions.includes(extension.key))
    .reduce<Record<string, Extension[]>>((acc, ext) => {
      if (!acc[ext.key]) {
        acc[ext.key] = []
      }
      acc[ext.key].push(ext)
      return acc
    }, {})

  for (const key of Object.keys(groupedExtensions)) {
    const extensions = groupedExtensions[key].sort((a, b) => semver.rcompare(a.version, b.version))
    const neededVersionRange = neededExtensions[key]

    const matchingExtensions = extensions.filter((ext) =>
      neededVersionRange ? semver.satisfies(ext.version, neededVersionRange) : false
    )
    if (matchingExtensions.length) {
      selectedExtensions.push(matchingExtensions[0])
    } else if (extensions.length) {
      selectedExtensions.push(extensions[0])
    }
  }

  return selectedExtensions
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

export async function fetchResourceItems(type: ItemType, filter: string): Promise<ResourceItem[]> {
  const url = new URL(`${resourceHost}/api/list/${type}`)
  if (filter) {
    url.searchParams.append('filter', filter)
  }
  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`Failed to fetch items: ${response.statusText}`)
  }

  const data: ResourceItem[] = await response.json()
  data.forEach((item) => (item.type = type))
  return data
}

export async function fetchResourceVersions(item: ResourceItem): Promise<ResourceVersion[]> {
  const response = await fetch(`${resourceHost}/api/${item.type}/${item.id}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch versions: ${response.statusText}`)
  }

  const data: ResourceVersion[] = await response.json()
  return data
}

export async function downloadResource(
  item: ResourceItem,
  version: ResourceVersion,
  path: string
): Promise<boolean> {
  try {
    const response = await fetch(`${resourceHost}/api/download/${item.type}/${version.id}`)
    if (!response.ok) {
      return false
    }
    const buffer = await response.arrayBuffer()
    await fsPromises.writeFile(path, Buffer.from(buffer))
    return true
  } catch {
    return false
  }
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
