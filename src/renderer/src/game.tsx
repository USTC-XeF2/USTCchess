import './assets/game.css'

import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'

import { ConfigProvider } from 'antd'
import enUS from 'antd/locale/en_US'
import zhCN from 'antd/locale/zh_CN'

import { Map } from 'src/types/map'

import ChessboardComponent from './components/Chessboard'

const localeOptions = {
  enUS: enUS,
  zhCN: zhCN
}

function App(): JSX.Element {
  const [initialized, setInitialized] = useState<boolean>(false)
  const [locale, setLocale] = useState<string>('')
  const [primaryColor, setPrimaryColor] = useState<string>('')
  const [mapData, setMapData] = useState<Map>()
  const reload = async (): Promise<void> => {
    setLocale(await window.electronAPI.getSetting('language'))
    setPrimaryColor(await window.electronAPI.getSetting('primary-color'))
    setMapData(await window.electronAPI.getMapData())
  }
  if (!initialized) {
    reload()
    setInitialized(true)
  }

  if (!mapData) {
    return <></>
  }
  const chessboard = window.electronAPI.generateChessboard(mapData)

  return (
    <ConfigProvider
      locale={localeOptions[locale]}
      theme={{ token: { colorPrimary: primaryColor } }}
    >
      <ChessboardComponent chessboard={chessboard} />
    </ConfigProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
