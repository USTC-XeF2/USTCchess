import './assets/main.css'
import icon from './assets/icon.png'

import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'

import {
  AppstoreOutlined,
  BlockOutlined,
  BorderOutlined,
  CloseOutlined,
  HomeOutlined,
  LineOutlined,
  SettingOutlined
} from '@ant-design/icons'
import type { TabsProps } from 'antd'
import { Button, ConfigProvider, Image, Space, Tabs, theme, Typography } from 'antd'
import enUS from 'antd/locale/en_US'
import zhCN from 'antd/locale/zh_CN'

import StartPage from './components/StartPage'
import ExtensionPage from './components/ExtensionPage'
import SettingPage from './components/SettingPage'

const tabItems: TabsProps['items'] = [
  {
    key: 'start',
    label: '开始',
    icon: <HomeOutlined />,
    children: <StartPage />
  },
  {
    key: 'extension',
    label: '扩展',
    icon: <AppstoreOutlined />,
    children: <ExtensionPage />
  },
  {
    key: 'setting',
    label: '设置',
    icon: <SettingOutlined />,
    children: <SettingPage />
  }
]

const localeOptions = {
  enUS: enUS,
  zhCN: zhCN
}

function App(): JSX.Element {
  const [isMaximized, setMaximized] = useState<boolean>(false)
  const [locale, setLocale] = useState<string>('')
  const [isDark, setIsDark] = useState<boolean>(false)
  const [primaryColor, setPrimaryColor] = useState<string>('')

  useEffect(() => {
    const reload = async (): Promise<void> => {
      setLocale(await window.electronAPI.getSetting('language'))
      setIsDark(await window.electronAPI.getIsDark())
      setPrimaryColor(await window.electronAPI.getSetting('primary-color'))
    }

    reload()
    window.addEventListener('update-mainwindow', reload)
    window.electronAPI.on('update-theme', reload)
    window.electronAPI.on('window-maximize', (val) => setMaximized(val as boolean))
  }, [])

  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', primaryColor)
  }, [primaryColor])

  const titleBar = {
    left: (
      <Space id="appTitle">
        <Image src={icon} preview={false} style={{ height: 24 }} />
        <Typography.Title level={4} style={{ margin: 0 }}>
          USTC Chess
        </Typography.Title>
      </Space>
    ),
    right: (
      <Space id="windowButtons">
        <Button
          type="text"
          icon={<LineOutlined />}
          size="small"
          onClick={() => window.electronAPI.controlWindow('minimize')}
        />
        <Button
          type="text"
          icon={isMaximized ? <BlockOutlined rotate={90} /> : <BorderOutlined />}
          size="small"
          onClick={() => window.electronAPI.controlWindow('maximize')}
        />
        <Button
          type="text"
          icon={<CloseOutlined />}
          size="small"
          onClick={() => window.electronAPI.controlWindow('close')}
        />
      </Space>
    )
  }

  return (
    <ConfigProvider
      locale={localeOptions[locale]}
      theme={{
        token: { colorPrimary: primaryColor },
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm
      }}
    >
      <Tabs
        tabBarExtraContent={titleBar}
        defaultActiveKey="start"
        centered
        items={tabItems}
        style={{ height: '100vh' }}
      />
    </ConfigProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
