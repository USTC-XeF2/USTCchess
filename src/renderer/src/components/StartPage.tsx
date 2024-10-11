import { useState } from 'react'
import { UploadOutlined } from '@ant-design/icons'
import type { ButtonProps, SelectProps, UploadProps } from 'antd'
import { Alert, Button, Card, Divider, Flex, message, Select, Space, Upload } from 'antd'

const gamemodes: SelectProps['options'] = [
  { value: 'single', label: '单人模式' },
  { value: 'quick-online', label: '快速联机', disabled: true },
  { value: 'room-online', label: '房间模式', disabled: true }
]

function StartPage(): JSX.Element {
  const [isGameRunning, setGameRunning] = useState<boolean>(false)
  const [currentGamemode, setCurrentGamemode] = useState<string>('single')
  const [mapLoadStatus, setMapLoadStatus] = useState<number>(1)
  const [mapData, setMapData] = useState<object>({})

  const onStartGame: ButtonProps['onClick'] = async () => {
    if (mapLoadStatus) {
      message.info('尚未选择地图文件')
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
      .then((data: object) => {
        setMapData(data)
        setMapLoadStatus(0)
      })
      .catch(() => {
        setMapData({})
        setMapLoadStatus(2)
      })
    return false
  }

  return (
    <Flex gap="middle" style={{ height: '100%' }}>
      <Card style={{ width: 300 }}>
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
      <Card
        title={mapLoadStatus ? '地图预览' : '地图预览-' + mapData['name']}
        style={{ width: '100%' }}
      >
        {mapLoadStatus == 1 && <Alert message="暂未选择地图" type="warning" showIcon />}
        {mapLoadStatus == 2 && <Alert message="地图文件格式错误" type="error" showIcon />}
        {mapLoadStatus == 0 && <span>{JSON.stringify(mapData)}</span>}
      </Card>
    </Flex>
  )
}

export default StartPage
