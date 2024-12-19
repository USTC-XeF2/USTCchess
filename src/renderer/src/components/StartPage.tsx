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
  Input,
  InputNumber,
  message,
  Select,
  Space,
  Tabs,
  Tooltip,
  Typography
} from 'antd'

import { GameData } from 'src/types/game'

import ChessboardComponent from './Chessboard'

const gamemodeOptions: SelectProps['options'] = [
  { value: 'local-mode', label: '本地模式' },
  { value: 'quick-online', label: '快速联机' },
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
        <Tooltip title={extension ? `当前版本为${extension.version}` : ''}>
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
          getSize={() => ({
            width: 0.3 * window.innerWidth + 100,
            height: 0.8 * window.innerHeight - 50
          })}
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
  const [gamemode, setGamemode] = useState<string>('local-mode')
  const [onlineMode, setOnlineMode] = useState<string>('create')
  const [port, setPort] = useState<string | null>(null)
  const [address, setAddress] = useState<string>('')
  const [mapLoadError, setMapLoadError] = useState<boolean>(false)
  const [gameData, setGameData] = useState<GameData>()

  const refreshGameData = async (reload: boolean): Promise<void> =>
    setGameData(await window.electronAPI.getGameData(reload))

  useEffect(() => {
    ;(async (): Promise<void> => {
      setGameRunning(await window.electronAPI.getGameStatus())
      setGamemode(await window.electronAPI.getGamemode())
    })()
    refreshGameData(false)

    window.electronAPI.on('update-map', () => refreshGameData(true))
    window.electronAPI.on('stop-game', () => setGameRunning(false))
    return (): void => {
      window.electronAPI.off('update-map')
      window.electronAPI.off('stop-game')
    }
  }, [])

  const [messageApi, contextHolder] = message.useMessage()
  const startGame: ButtonProps['onClick'] = async () => {
    if (mapLoadError) {
      messageApi.warning('地图文件格式错误')
      return
    } else if (!gameData) {
      messageApi.info('未选择地图文件')
      return
    }
    window.electronAPI
      .startGame(gamemode, onlineMode, { port, address })
      .then((v) => {
        if (v) setGameRunning(true)
      })
      .catch((e) => messageApi.error(e.message.substring(e.message.lastIndexOf(':') + 1).trim()))
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
          <Button type="primary" disabled={isGameRunning} onClick={startGame} block>
            {isGameRunning ? '游戏运行中' : '开始游戏'}
          </Button>
          <Select
            value={gamemode}
            onChange={async (m) => setGamemode(await window.electronAPI.getGamemode(m))}
            options={gamemodeOptions}
            style={{ width: '100%' }}
          />
          {gamemode === 'quick-online' && (
            <Tabs size="small" centered activeKey={onlineMode} onChange={(v) => setOnlineMode(v)}>
              <Tabs.TabPane tab="创建联机" key="create">
                <InputNumber
                  addonBefore="端口号"
                  placeholder="随机"
                  min="1"
                  max="65535"
                  precision={0}
                  value={port}
                  onChange={(v) => setPort(v)}
                />
              </Tabs.TabPane>
              <Tabs.TabPane tab="加入联机" key="join">
                <Input
                  placeholder="联机地址"
                  allowClear
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </Tabs.TabPane>
            </Tabs>
          )}
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
          <Button icon={<ReloadOutlined />} onClick={() => refreshGameData(true)}>
            重新加载
          </Button>
        }
        style={{ width: '100%', overflowY: 'auto' }}
      >
        <MapPreload gameData={gameData} />
      </Card>
      {contextHolder}
    </Flex>
  )
}

export default StartPage
