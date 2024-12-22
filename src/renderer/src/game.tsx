import './assets/game.css'

import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'

import { FrownOutlined, MehOutlined, SmileOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  Flex,
  message,
  Modal,
  notification,
  Result,
  Space,
  Spin,
  Typography
} from 'antd'

import { Position } from 'src/types/chessboard'
import { GameInfo, GameState, GamePrompt, GameResult } from 'src/types/game'

import AppConfig from './config'
import ChessboardComponent from './components/Chessboard'

const getColor = (camp?: number): string => (camp == 1 ? 'red' : camp == 2 ? 'blue' : 'green')

function Game(): JSX.Element {
  const [gameInfo, setGameInfo] = useState<GameInfo>()
  const [gameState, setGameState] = useState<GameState>()
  const [gamePrompt, setGamePrompt] = useState<GamePrompt>()
  const [gameResult, setGameResult] = useState<GameResult>()
  const [noticeApi, noticeHolder] = notification.useNotification()
  const [messageApi, messageHolder] = message.useMessage()
  const [showGameResult, setShowGameResult] = useState(false)

  const getGameInfo = (): Promise<void> =>
    window.electronAPI.contact('get-info').then((res) => {
      if (res.status === 'success') setGameInfo(res.data as GameInfo)
    })
  const getGameState = (): Promise<void> =>
    window.electronAPI.contact('get-state').then((res) => {
      if (res.status === 'success') setGameState(res.data as GameState)
    })

  const draw = (result: boolean): void => {
    noticeApi.destroy('draw')
    window.electronAPI.contact('draw', result)
  }

  useEffect(() => {
    getGameInfo()
    getGameState()

    window.electronAPI.on('connect-success', () => {
      getGameInfo()
      getGameState()
    })
    window.electronAPI.on('game-start', getGameState)
    window.electronAPI.on('change-turn', async (data) => {
      await getGameState()
      setGamePrompt(data as GamePrompt)
    })
    window.electronAPI.on('draw', () => {
      noticeApi.open({
        key: 'draw',
        message: '和棋请求',
        description: '对方发起了和棋请求',
        btn: (
          <Space>
            <Button size="small" onClick={() => draw(false)}>
              拒绝
            </Button>
            <Button type="primary" size="small" onClick={() => draw(true)}>
              同意
            </Button>
          </Space>
        ),
        duration: 0,
        placement: 'top',
        onClose: () => draw(false)
      })
    })
    window.electronAPI.on('draw-refused', () => {
      noticeApi.destroy('draw')
      messageApi.destroy()
      messageApi.info('对方拒绝了和棋请求')
    })
    window.electronAPI.on('game-end', (data) => {
      setGameResult(data as GameResult)
      setShowGameResult(true)
    })
    return (): void => {
      window.electronAPI.off('connect-success')
      window.electronAPI.off('game-start')
      window.electronAPI.off('change-turn')
      window.electronAPI.off('draw')
      window.electronAPI.off('draw-refused')
      window.electronAPI.off('game-end')
    }
  }, [])

  if (!gameInfo) return <Spin tip="连接服务器中..." fullscreen delay={100} />

  const { camp, mapData } = gameInfo
  const getAvailableMoves = async (pos: Position): Promise<Position[]> =>
    (await window.electronAPI.contact('get-available-moves', pos)).data as Position[]
  const canMove = async (pos: Position): Promise<boolean> => {
    if (gameState?.currentTurn !== camp) return false
    if (gameResult) return false
    const chess = gameState.chessboard[pos[0]][pos[1]]
    if (chess?.camp && chess.camp !== camp) return false
    return Boolean((await getAvailableMoves(pos)).length)
  }
  const campStyle = { color: getColor(camp) }
  return (
    <>
      <Card style={{ height: 72, margin: 12 }}>
        <Flex justify="space-evenly">
          <Typography.Text>
            本方阵营：<span style={campStyle}>▇</span>
          </Typography.Text>
          <Typography.Text>
            {gameResult ? (
              showGameResult ? (
                '游戏已结束'
              ) : (
                <Button type="link" size="small" onClick={() => setShowGameResult(true)}>
                  查看游戏结果
                </Button>
              )
            ) : gameState?.currentTurn ? (
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
          width: window.innerWidth - 24,
          height: window.innerHeight - 112
        })}
        intersection={mapData.chessboard.intersection}
        reverse={camp === 2}
        draggable
        gamePrompt={gamePrompt}
        getAvailableMoves={getAvailableMoves}
        canMove={canMove}
        move={(from, to) => window.electronAPI.contact('move', { from, to })}
      />
      {noticeHolder}
      {messageHolder}

      <Modal
        centered
        width={240}
        footer={null}
        open={gameResult && showGameResult}
        onCancel={() => setShowGameResult(false)}
      >
        {gameResult && (
          <Result
            icon={
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
            title={gameResult.winner ? `${gameResult.winner === 1 ? '红' : '蓝'}方胜利` : '平局'}
            extra={gameResult.info}
          />
        )}
      </Modal>
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
