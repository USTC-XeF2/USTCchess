import './assets/game.css'

import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'

import { FrownOutlined, MehOutlined, SmileOutlined } from '@ant-design/icons'
import { Card, Flex, Spin, Typography } from 'antd'

import { Chessboard, Position } from 'src/types/chessboard'
import { Map } from 'src/types/map'

import AppConfig from './config'
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

const getColor = (camp?: number): string => (camp == 1 ? 'red' : camp == 2 ? 'blue' : 'green')

function Game(): JSX.Element {
  const [info, setInfo] = useState<Info>()
  const [gameState, setGameState] = useState<GameState>()
  const [isCheckedPos, setIsCheckedPos] = useState<Position[]>([])
  const [gameResult, setGameResult] = useState<GameResult>()

  const getInfo = (): Promise<void> =>
    window.electronAPI.contact('get-info').then((res) => {
      if (res.status === 'success') setInfo(res.data as Info)
    })
  const getGameState = (): Promise<void> =>
    window.electronAPI.contact('get-state').then((res) => {
      if (res.status === 'success') setGameState(res.data as GameState)
    })

  useEffect(() => {
    getInfo()
    getGameState()

    window.electronAPI.on('connect-success', () => {
      getInfo()
      getGameState()
    })
    window.electronAPI.on('game-start', getGameState)
    window.electronAPI.on('change-turn', async () => {
      await getGameState()
      window.electronAPI.contact('get-is-checked').then((res) => {
        if (res.status === 'success') setIsCheckedPos(res.data as Position[])
      })
    })
    window.electronAPI.on('game-end', (data) => {
      setGameResult(data as GameResult)
    })
    return (): void => {
      window.electronAPI.off('connect-success')
      window.electronAPI.off('game-start')
      window.electronAPI.off('change-turn')
      window.electronAPI.off('game-end')
    }
  }, [])

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
    <>
      <Card style={{ margin: 10 }}>
        <Flex justify="space-evenly">
          <Typography.Text>
            本方阵营：<span style={campStyle}>▇</span>
          </Typography.Text>
          <Typography.Text>
            {gameState?.currentTurn ? (
              <>
                当前回合：
                <span style={{ color: getColor(gameState?.currentTurn) }}>
                  {gameState.currentTurn == camp ? '己方回合' : '对方回合'}
                </span>
              </>
            ) : (
              '等待游戏开始'
            )}
          </Typography.Text>
        </Flex>
      </Card>
      <ChessboardComponent
        chessboard={gameState?.chessboard || window.electronAPI.generateChessboard(mapData)}
        getSize={() => ({
          width: 0.9 * window.innerWidth,
          height: 0.9 * window.innerHeight - 50
        })}
        intersection={mapData.chessboard.intersection}
        reverse={camp === 2}
        draggable
        checkedPos={isCheckedPos}
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
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AppConfig>
      <Game />
    </AppConfig>
  </React.StrictMode>
)
