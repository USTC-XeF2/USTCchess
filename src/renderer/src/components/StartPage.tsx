import { useState, useEffect } from 'react'
import { UploadOutlined } from '@ant-design/icons'
import type { ButtonProps, CollapseProps, DescriptionsProps, SelectProps, UploadProps } from 'antd'
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
  Upload
} from 'antd'

import { Map, Version, VersionRange } from 'src/types/map'
import { ExtensionInfo } from 'src/types/extension'

import ChessboardComponent from './Chessboard'

const gamemodes: SelectProps['options'] = [
  { value: 'single', label: '单人模式' },
  { value: 'quick-online', label: '快速联机', disabled: true },
  { value: 'room-online', label: '房间模式', disabled: true }
]

const isVersionInRange = (version: Version, range: VersionRange): boolean => {
  return (
    (range[0] === 'auto' || version >= range[0]) && (range[1] === 'auto' || version <= range[1])
  )
}

function MapPreload({ mapData }: { mapData: Map }): JSX.Element {
  const [extensions, setExtensions] = useState<ExtensionInfo[]>([])

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      setExtensions(await window.electronAPI.getExtensionsInfo())
    }
    fetchData()
    window.addEventListener('updatesettings', fetchData)
  }, [])

  const basicInformation: DescriptionsProps['items'] = [
    {
      label: '名称',
      children: mapData.name
    },
    {
      label: '版本',
      children: mapData.version.join('.')
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
  const chessboard = window.electronAPI.generateChessboard(mapData)
  const otherInformation: CollapseProps['items'] = [
    {
      key: '1',
      label: '扩展列表',
      children: (
        <Descriptions
          items={Object.keys(mapData.extensions).map((key) => {
            const extension = extensions.find((v) => v.key === key)
            const state = !extension
              ? 2
              : isVersionInRange(extension.version, mapData.extensions[key])
                ? 0
                : 1
            return {
              label: key,
              children: (
                <Tooltip
                  title={
                    ['', `版本不符: 当前版本为${extension?.version.join('.')}`, '扩展不存在'][state]
                  }
                >
                  <span style={{ color: ['green', 'gold', 'red'][state] }}>
                    {mapData.extensions[key]
                      .map((v) => (v === 'auto' ? '任意' : v.join('.')))
                      .join(' - ')}
                  </span>
                </Tooltip>
              )
            }
          })}
        />
      )
    },
    {
      key: '2',
      label: '棋盘预览',
      children: (
        <ChessboardComponent
          chessboard={chessboard}
          intersection={mapData.chessboard.intersection}
          getCard={(id) => mapData.cards.find((v) => v.id === id)!}
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
  const [currentGamemode, setCurrentGamemode] = useState<string>('single')
  const [mapLoadError, setMapLoadError] = useState<boolean>(false)
  const [mapData, setMapData] = useState<Map>()

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      setGameRunning(await window.electronAPI.getGameStatus())
    }
    fetchData()
  }, [])

  const onStartGame: ButtonProps['onClick'] = async () => {
    if (mapLoadError) {
      message.warning('地图文件格式错误')
      return
    } else if (!mapData) {
      message.info('未选择地图文件')
      return
    }
    const error = await window.electronAPI.startGame(currentGamemode, mapData)
    if (error) {
      message.error(error)
    } else {
      setGameRunning(true)
    }
  }

  window.electronAPI.onStopGame(() => setGameRunning(false))

  const loadMapFile: UploadProps['beforeUpload'] = async (file) => {
    const text = await file.text()
    window.electronAPI
      .analyzeMap(text)
      .then((map: Map) => {
        setMapData(map)
        setMapLoadError(false)
      })
      .catch(() => {
        setMapData(undefined)
        setMapLoadError(true)
      })
    return false
  }

  return (
    <Flex gap="middle" style={{ height: '100%' }}>
      <Card style={{ width: 'min(30%,300px)' }}>
        <Space direction="vertical" style={{ display: 'flex' }}>
          <Button type="primary" disabled={isGameRunning} onClick={onStartGame} block>
            开始游戏
          </Button>
          <Select
            defaultValue="single"
            style={{ width: '100%' }}
            onChange={(v) => {
              setCurrentGamemode(v)
            }}
            options={gamemodes}
          />
          <Divider />
          <Upload
            accept=".json"
            maxCount={1}
            beforeUpload={loadMapFile}
            showUploadList={{ showRemoveIcon: false }}
          >
            <Button icon={<UploadOutlined />} block>
              选择地图
            </Button>
          </Upload>
        </Space>
      </Card>
      <Card title="地图预览" style={{ width: '100%', overflowY: 'auto' }}>
        {!mapLoadError && !mapData && <Alert message="暂未选择地图" type="warning" showIcon />}
        {mapLoadError && <Alert message="地图文件格式错误" type="error" showIcon />}
        {mapData && <MapPreload mapData={mapData} />}
      </Card>
    </Flex>
  )
}

export default StartPage
