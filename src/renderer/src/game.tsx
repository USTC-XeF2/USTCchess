import './assets/game.css'

import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'

import { ConfigProvider, Spin } from 'antd'
import enUS from 'antd/locale/en_US'
import zhCN from 'antd/locale/zh_CN'

import { Chessboard } from 'src/types/chessboard'
import { Map } from 'src/types/map'

import ChessboardComponent from './components/Chessboard'

interface Info {
  turn: number
  mapData: Map
}

interface GameState {
  currentTurn: number
  chessboard: Chessboard
}

const localeOptions = {
  enUS: enUS,
  zhCN: zhCN
}

function App(): JSX.Element {
  const [locale, setLocale] = useState<string>('')
  const [primaryColor, setPrimaryColor] = useState<string>('')
  const [info, setInfo] = useState<Info>()
  const [gameState, setGameState] = useState<GameState>()
  const reload = async (): Promise<void> => {
    setLocale(await window.electronAPI.getSetting('language'))
    setPrimaryColor(await window.electronAPI.getSetting('primary-color'))
  }
  const getInfo = (): Promise<void> =>
    window.electronAPI.contact('get-info').then((res) => {
      if (res.status === 'success') setInfo(res.data as Info)
    })
  const getGameState = (): Promise<void> =>
    window.electronAPI.contact('get-state').then((res) => {
      if (res.status === 'success') setGameState(res.data as GameState)
    })

  useEffect(() => {
    reload()
    getInfo()
    getGameState()
  }, [])

  window.electronAPI.wait('connect-success', () => {
    getInfo()
    getGameState()
  })
  window.electronAPI.wait('game-start', () => {
    getGameState()
  })

  if (!info) return <Spin tip="连接服务器中..." fullscreen delay={100} />

  const { turn, mapData } = info
  return (
    <ConfigProvider
      locale={localeOptions[locale]}
      theme={{ token: { colorPrimary: primaryColor } }}
    >
      <span>本方阵营：{turn}</span>
      {gameState?.currentTurn ? (
        <span>当前回合：{gameState.currentTurn}</span>
      ) : (
        <Spin tip="等待游戏开始..." fullscreen delay={100} />
      )}
      <ChessboardComponent
        chessboard={gameState?.chessboard || window.electronAPI.generateChessboard(mapData)}
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
