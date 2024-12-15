import { useState, useEffect } from 'react'

import { ConfigProvider, theme, ThemeConfig } from 'antd'
import enUS from 'antd/locale/en_US'
import zhCN from 'antd/locale/zh_CN'

const localeOptions = {
  enUS: enUS,
  zhCN: zhCN
}

function AppConfig({ children }: { children: JSX.Element }): JSX.Element {
  const [locale, setLocale] = useState<string>('')
  const [appTheme, setAppTheme] = useState<ThemeConfig>()

  useEffect(() => {
    const reload = async (): Promise<void> => {
      setLocale(await window.electronAPI.getSetting('language'))
      const { isDark, primaryColor } = await window.electronAPI.getTheme()
      setAppTheme({
        token: { colorPrimary: primaryColor },
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm
      })
    }
    reload()

    window.electronAPI.on('update-config', reload)
    return (): void => window.electronAPI.off('update-config')
  }, [])

  const token = theme.getDesignToken(appTheme)
  document.body.style.backgroundColor = token.colorBgElevated
  document.documentElement.style.setProperty('--scrollbar-color', token.colorFillContentHover)
  document.documentElement.style.setProperty('--scrollbar-hover', token.colorPrimaryBorderHover)

  return (
    <ConfigProvider locale={localeOptions[locale]} theme={appTheme}>
      {children}
    </ConfigProvider>
  )
}

export default AppConfig
