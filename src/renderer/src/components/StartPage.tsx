import { useState } from 'react'
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
  Upload
} from 'antd'

import { Map } from 'src/types/map'

import ChessboardComponent from './Chessboard'

import { ChessboardSetting } from 'src/types/chessboard'

const temp: ChessboardSetting = {
  width: 7,
  height: 9,
  intersection: true,
  init: {}
}

const gamemodes: SelectProps['options'] = [
  { value: 'single', label: '单人模式' },
  { value: 'quick-online', label: '快速联机', disabled: true },
  { value: 'room-online', label: '房间模式', disabled: true }
]

function MapPreload({ mapData }: { mapData: Map }): JSX.Element {
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
      label: '棋盘预览',
      children: <ChessboardComponent chessboard={chessboard} setting={temp} />
    },
    {
      key: '2',
      label: '扩展列表',
      children: (
        <Descriptions
          items={Object.keys(mapData.extensions).map((key) => ({
            label: key,
            children: mapData.extensions[key]
              .map((v) => (v === 'auto' ? '任意' : v.join('.')))
              .join('-')
          }))}
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

  const onStartGame: ButtonProps['onClick'] = async () => {
    if (mapLoadError) {
      message.warning('地图文件格式错误')
      return
    } else if (!mapData) {
      message.info('未选择地图文件')
      return
    }
    const status = await window.electronAPI.startGame(currentGamemode, mapData)
    if (status == 'success') {
      setGameRunning(true)
    } else {
      message.error('Error: ' + status)
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
      <Card style={{ width: 'min(30%,250px)' }}>
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
