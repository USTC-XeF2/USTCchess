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
import { Button, Image, Space, Tabs, Typography } from 'antd'

import AppConfig from './config'
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

function Main(): JSX.Element {
  const [isMaximized, setMaximized] = useState<boolean>(false)

  useEffect(() => {
    window.addEventListener('update-mainwindow', window.electronAPI.updateConfig)
    window.electronAPI.on('window-maximize', (val) => setMaximized(val as boolean))
  }, [])

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
    <Tabs
      tabBarExtraContent={titleBar}
      defaultActiveKey="start"
      centered
      items={tabItems}
      style={{ height: '100vh' }}
    />
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AppConfig>
      <Main />
    </AppConfig>
  </React.StrictMode>
)
