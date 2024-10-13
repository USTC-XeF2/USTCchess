export interface Settings {
  'auto-minimize-mainwindow': boolean
  'auto-enable-extensions': boolean
  language: string
  'primary-color': string
}

export type SettingValue<T extends keyof Settings> = Settings[T]
