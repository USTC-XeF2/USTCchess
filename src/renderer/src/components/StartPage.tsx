import { useState, useEffect } from 'react'
import semver from 'semver'
import { ReloadOutlined, SelectOutlined } from '@ant-design/icons'
import type { ButtonProps, CollapseProps, DescriptionsProps, SelectProps } from 'antd'
import {
  Alert,
  Button,
  Card,
  Collapse,
  Descriptions,
  Divider,
  Flex,
  message,
  Select,
  Space,
  Tooltip,
  Typography
} from 'antd'

import { GameData } from 'src/types/game'

import ChessboardComponent from './Chessboard'

const gamemodes: SelectProps['options'] = [
  { value: 'local-mode', label: '本地模式' },
  { value: 'quick-online', label: '快速联机', disabled: true },
  { value: 'room-online', label: '房间模式', disabled: true }
]

function MapPreload({ gameData }: { gameData?: GameData }): JSX.Element {
  if (!gameData?.mapData) return <Alert message="暂未选择地图" type="warning" showIcon />
  const { mapData, extensions, chessboard } = gameData

  const basicInformation: DescriptionsProps['items'] = [
    {
      label: '名称',
      children: mapData.name
    },
    {
      label: '版本',
      children: mapData.version
    },
    {
      label: '作者',
      children: mapData.author
    },
    {
      label: '简介',
      children: mapData.description
    }
  ]
  const extensionItems = Object.keys(mapData.extensions).map((key) => {
    const extension = extensions.find((v) => v.key === key)
    const state = !extension
      ? 'danger'
      : semver.satisfies(extension.version, mapData.extensions[key])
        ? 'success'
        : 'warning'
    return {
      label: key,
      children: (
        <Tooltip title={`当前版本为${extension?.version}`}>
          <Typography.Text type={state}>{mapData.extensions[key]}</Typography.Text>
        </Tooltip>
      )
    }
  })
  const otherInformation: CollapseProps['items'] = [
    {
      key: '1',
      label: '扩展列表',
      children: <Descriptions items={extensionItems} />
    },
    {
      key: '2',
      label: '棋盘预览',
      children: (
        <ChessboardComponent
          chessboard={chessboard}
          maxWidth="calc(30vw + 100px)"
          maxHeight="calc(80vh - 50px)"
          intersection={mapData.chessboard.intersection}
          getAvailableMoves={async (pos) => window.electronAPI.getAvailableMoves(pos)}
        />
      )
    }
  ]

  return (
    <>
      <Descriptions items={basicInformation} />
      <br />
      <Collapse items={otherInformation} defaultActiveKey={['1']} />
    </>
  )
}

function StartPage(): JSX.Element {
  const [isGameRunning, setGameRunning] = useState<boolean>(false)
  const [currentGamemode, setCurrentGamemode] = useState<string>('local-mode')
  const [mapLoadError, setMapLoadError] = useState<boolean>(false)
  const [gameData, setGameData] = useState<GameData>()

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      setGameRunning(await window.electronAPI.getGameStatus())
      setGameData(await window.electronAPI.getGameData())
    }
    fetchData()

    window.electronAPI.on('stop-game', () => setGameRunning(false))
  }, [])

  const onStartGame: ButtonProps['onClick'] = async () => {
    if (mapLoadError) {
      message.warning('地图文件格式错误')
      return
    } else if (!gameData) {
      message.info('未选择地图文件')
      return
    }
    const error = await window.electronAPI.startGame(currentGamemode)
    if (error) {
      message.error(error)
    } else {
      setGameRunning(true)
    }
  }

  const chooseMap: ButtonProps['onClick'] = async () => {
    const res = await window.electronAPI.chooseMap()
    setMapLoadError(!res)
    if (res) setGameData(await window.electronAPI.getGameData())
  }

  return (
    <Flex gap="middle" style={{ height: '100%' }}>
      <Card style={{ width: 300 }}>
        <Space direction="vertical" style={{ display: 'flex' }}>
          <Button type="primary" disabled={isGameRunning} onClick={onStartGame} block>
            开始游戏
          </Button>
          <Select
            defaultValue="local-mode"
            style={{ width: '100%' }}
            onChange={(v) => {
              setCurrentGamemode(v)
            }}
            options={gamemodes}
          />
          <Divider />
          <Button icon={<SelectOutlined />} onClick={chooseMap} block>
            选择地图
          </Button>
          {mapLoadError && (
            <Alert
              message="格式错误"
              type="error"
              showIcon
              closable
              afterClose={() => setMapLoadError(false)}
            />
          )}
        </Space>
      </Card>
      <Card
        title="地图预览"
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={async () => setGameData(await window.electronAPI.getGameData(true))}
          >
            重新加载
          </Button>
        }
        style={{ width: '100%', overflowY: 'auto' }}
      >
        <MapPreload gameData={gameData} />
      </Card>
    </Flex>
  )
}

export default StartPage
