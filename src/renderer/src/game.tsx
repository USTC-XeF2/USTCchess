import './assets/game.css'

import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'

import { FrownOutlined, MehOutlined, SmileOutlined } from '@ant-design/icons'
import { ConfigProvider, Spin } from 'antd'
import enUS from 'antd/locale/en_US'
import zhCN from 'antd/locale/zh_CN'

import { Chessboard, Position } from 'src/types/chessboard'
import { Map } from 'src/types/map'

import ChessboardComponent from './components/Chessboard'

interface Info {
  camp: number
  mapData: Map
}

interface GameState {
  currentTurn: number
  chessboard: Chessboard
}

interface GameResult {
  winner: number
  info?: string
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
  const [gameResult, setGameResult] = useState<GameResult>()
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

  window.electronAPI.on('connect-success', () => {
    getInfo()
    getGameState()
  })
  window.electronAPI.on('game-start', getGameState)
  window.electronAPI.on('change-turn', getGameState)
  window.electronAPI.on('game-end', (data) => {
    setGameResult(data as GameResult)
  })

  if (!info) return <Spin tip="连接服务器中..." fullscreen delay={100} />

  const { camp, mapData } = info
  return (
    <ConfigProvider
      locale={localeOptions[locale]}
      theme={{ token: { colorPrimary: primaryColor } }}
    >
      <span>本方阵营：{camp}</span>
      {gameState?.currentTurn ? (
        <span>当前回合：{gameState.currentTurn}</span>
      ) : (
        <Spin tip="等待游戏开始..." fullscreen delay={100} />
      )}
      <ChessboardComponent
        chessboard={gameState?.chessboard || window.electronAPI.generateChessboard(mapData)}
        intersection={mapData.chessboard.intersection}
        reverse={camp === 2}
        move={(from, to) => window.electronAPI.contact('move', { from, to })}
        getAvailableMoves={async (pos) =>
          (await window.electronAPI.contact('get-available-moves', pos)).data as Position[]
        }
      />
      {gameResult ? (
        <Spin
          indicator={
            gameResult.winner ? (
              gameResult.winner === camp ? (
                <SmileOutlined />
              ) : (
                <FrownOutlined />
              )
            ) : (
              <MehOutlined />
            )
          }
          tip={
            <>
              <div style={{ fontSize: 24 }}>
                {gameResult.winner ? `${gameResult.winner === 1 ? '红' : '蓝'}方胜利` : '平局'}
              </div>
              <div style={{ fontSize: 16 }}>{gameResult.info}</div>
            </>
          }
          size="large"
          fullscreen
        />
      ) : null}
    </ConfigProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
