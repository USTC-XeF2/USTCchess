import { ExtNameList } from './extension'

export interface LastLoaded {
  'last-gamemode'?: string
  'last-loaded-map'?: string
  'enabled-extensions'?: ExtNameList
}

export interface Settings {
  'auto-minimize-mainwindow': boolean
  'auto-reload-map': boolean
  'auto-enable-extensions': boolean
  'check-extensions': boolean
  'extensions-save-path': string
  language: string
  theme: string
  'primary-color': string
}

export type SettingValue<T extends keyof Settings> = Settings[T]
