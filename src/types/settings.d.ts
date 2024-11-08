export interface Settings {
  'auto-minimize-mainwindow': boolean
  'auto-enable-extensions': boolean
  'check-extensions': boolean
  'extensions-save-path': string
  language: string
  theme: string
  'primary-color': string
}

export type SettingValue<T extends keyof Settings> = Settings[T]
