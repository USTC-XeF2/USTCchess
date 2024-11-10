import './assets/game.css'

import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'

import { FrownOutlined, MehOutlined, SmileOutlined } from '@ant-design/icons'
import { Card, ConfigProvider, Flex, Spin, theme, Typography } from 'antd'
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

const getColor = (camp?: number): string => (camp == 1 ? 'red' : camp == 2 ? 'blue' : 'green')

function App(): JSX.Element {
  const [locale, setLocale] = useState<string>('')
  const [isDark, setIsDark] = useState<boolean>(false)
  const [primaryColor, setPrimaryColor] = useState<string>('')
  const [info, setInfo] = useState<Info>()
  const [gameState, setGameState] = useState<GameState>()
  const [gameResult, setGameResult] = useState<GameResult>()
  const reload = async (): Promise<void> => {
    setLocale(await window.electronAPI.getSetting('language'))
    setIsDark(await window.electronAPI.getIsDark())
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

    window.electronAPI.on('update-theme', reload)
    window.electronAPI.on('connect-success', () => {
      getInfo()
      getGameState()
    })
    window.electronAPI.on('game-start', getGameState)
    window.electronAPI.on('change-turn', getGameState)
    window.electronAPI.on('game-end', (data) => {
      setGameResult(data as GameResult)
    })
  }, [])

  useEffect(() => {
    document.documentElement.style.setProperty('--bg-color', isDark ? '#141414' : '#FFF')
    document.documentElement.style.setProperty('--primary-color', primaryColor)
  }, [isDark, primaryColor])

  if (!info) return <Spin tip="连接服务器中..." fullscreen delay={100} />

  const { camp, mapData } = info
  const getAvailableMoves = async (pos: Position): Promise<Position[]> =>
    (await window.electronAPI.contact('get-available-moves', pos)).data as Position[]
  const canMove = async (pos: Position): Promise<boolean> => {
    if (gameState?.currentTurn !== camp) return false
    const chess = gameState.chessboard[pos[0]][pos[1]]
    if (chess?.camp && chess.camp !== camp) return false
    return Boolean((await getAvailableMoves(pos)).length)
  }
  const campStyle = { color: getColor(camp) }
  return (
    <ConfigProvider
      locale={localeOptions[locale]}
      theme={{
        token: { colorPrimary: primaryColor },
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm
      }}
    >
      <Card style={{ margin: 10 }}>
        <Flex justify="space-evenly">
          <Typography.Text>
            本方阵营：<span style={campStyle}>▇</span>
          </Typography.Text>
          {gameState?.currentTurn ? (
            <Typography.Text>
              当前回合：
              <span style={{ color: getColor(gameState?.currentTurn) }}>
                {gameState.currentTurn == camp ? '己方回合' : '对方回合'}
              </span>
            </Typography.Text>
          ) : (
            <Spin tip="等待游戏开始..." fullscreen delay={100} />
          )}
        </Flex>
      </Card>
      <ChessboardComponent
        chessboard={gameState?.chessboard || window.electronAPI.generateChessboard(mapData)}
        maxWidth="90vw"
        maxHeight="calc(90vh - 50px)"
        intersection={mapData.chessboard.intersection}
        reverse={camp === 2}
        draggable
        getAvailableMoves={getAvailableMoves}
        canMove={canMove}
        move={(from, to) => window.electronAPI.contact('move', { from, to })}
      />
      {gameResult ? (
        <Spin
          indicator={
            gameResult.winner ? (
              gameResult.winner === camp ? (
                <SmileOutlined style={campStyle} />
              ) : (
                <FrownOutlined style={campStyle} />
              )
            ) : (
              <MehOutlined style={campStyle} />
            )
          }
          tip={
            <>
              <div style={{ fontSize: 24, color: getColor(gameResult.winner) }}>
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
