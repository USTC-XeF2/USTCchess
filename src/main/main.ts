import { shell, BrowserWindow } from 'electron'
import { basename, extname, join } from 'node:path'
import { access, mkdir, readdir, readFile, writeFile } from 'node:fs'
import { is } from '@electron-toolkit/utils'

const settingPath = './settings.json'
const extensionPath = './extensions'
//const extensionConfigPath = join(extensionPath, 'config.json')

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

export function analyzeMap(_e, text: string): Promise<object> {
  return new Promise((resolve, reject) => {
    try {
      const data = JSON.parse(text)
      if (!data['name']) {
        return reject('The file does not contain the attribute "name".')
      }
      resolve(data)
    } catch {
      reject('Unknown error.')
    }
  })
}

export function getExtensions(): Promise<object[]> {
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
          const extensions: object[] = []
          files.forEach((path, index) => {
            if (extname(path) == '.js') {
              // The metadata of the extensions should be read here
              extensions.push({
                key: index,
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

const defaultSettings = {
  'auto-minimize-mainwindow': true,
  'auto-enable-extensions': true,
  language: 'zhCN',
  'primary-color': '#1677ff'
}

export function getSettings(): Promise<object> {
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

export function getSetting(_e, value: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    getSettings().then((settings: object) => {
      if (value in settings) {
        resolve(settings[value])
      } else if (value in defaultSettings) {
        resolve(defaultSettings[value])
      } else {
        reject('The setting "' + value + '" does not exist.')
      }
    })
  })
}

export function changeSettings(_e, changedValues: object): void {
  getSettings().then((settings: object) => {
    const data = JSON.stringify({ ...settings, ...changedValues })
    writeFile(settingPath, data, () => {})
  })
}
