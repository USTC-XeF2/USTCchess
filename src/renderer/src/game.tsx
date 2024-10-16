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
    const res = await window.electronAPI.contact('get-map')
    if (res.status !== 'success') {
      console.error('Failed to get map data:', res.data)
      return
    }
    setMapData(res.data as Map)
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
      <ChessboardComponent
        chessboard={chessboard}
        intersection={mapData.chessboard.intersection}
        getCard={(id) => mapData.cards.find((v) => v.id === id)!}
      />
    </ConfigProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
