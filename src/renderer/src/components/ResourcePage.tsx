import { useCallback, useEffect, useState } from 'react'
import { ReloadOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  Flex,
  Input,
  List,
  message,
  Modal,
  Select,
  Space,
  Spin,
  Tabs,
  Typography
} from 'antd'

import { ItemType, ResourceItem, ResourceVersion } from 'src/types/resource'

const reloadEvent = new Event('reload-resource')

function ResourcePage(): JSX.Element {
  const [searchText, setSearchText] = useState('')
  const [selectedType, setSelectedType] = useState<ItemType>('map')
  const [selectedItem, setSelectedItem] = useState<ResourceItem | null>(null)
  const [selectedVersionId, setSelectedVersionId] = useState<number>()
  const [versions, setVersions] = useState<ResourceVersion[]>([])
  const [versionLoading, setVersionLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [messageApi, contextHolder] = message.useMessage()

  const ItemList = useCallback(
    ({ type }: { type: ItemType }): JSX.Element => {
      const [items, setItems] = useState<ResourceItem[]>([])
      const [loading, setLoading] = useState(false)

      const loadData = async (): Promise<void> => {
        if (loading) return
        setLoading(true)
        try {
          setItems(await window.electronAPI.fetchResourceItems(type, searchText))
        } catch {
          messageApi.error('获取资源列表失败')
        }
        setLoading(false)
      }

      useEffect(() => {
        loadData()

        window.addEventListener('reload-resource', loadData)
        return (): void => {
          window.removeEventListener('reload-resource', loadData)
        }
      }, [type])

      if (loading) {
        return (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin size="large" />
          </div>
        )
      }

      return (
        <List
          grid={{ gutter: 20, column: 2 }}
          dataSource={items}
          renderItem={(item) => (
            <List.Item>
              <Card hoverable onClick={() => setSelectedItem(item)} style={{ margin: 0 }}>
                <Flex align="center" justify="space-between">
                  <Space>
                    <Typography.Text strong>{item.name}</Typography.Text>
                    <Typography.Text type="secondary">{item.id}</Typography.Text>
                  </Space>
                  <Typography.Text type="secondary">v{item.latest_version}</Typography.Text>
                </Flex>
              </Card>
            </List.Item>
          )}
          style={{ overflowX: 'hidden' }}
        />
      )
    },
    [searchText, messageApi]
  )

  const tabItems = [
    {
      key: 'map',
      label: '地图',
      children: <ItemList type="map" />
    },
    {
      key: 'extension',
      label: '扩展',
      children: <ItemList type="extension" />
    }
  ]

  useEffect(() => {
    const fetchVersions = async (): Promise<void> => {
      if (selectedItem) {
        setVersionLoading(true)
        try {
          const data = await window.electronAPI.fetchResourceVersions(selectedItem)
          data.reverse()
          if (data.length > 0) {
            setSelectedVersionId(data[0].id)
          }
          setVersions(data)
        } catch (error) {
          messageApi.error('获取版本信息失败')
        }
        setVersionLoading(false)
      }
    }
    fetchVersions()
  }, [selectedItem])

  const handleDownload = async (): Promise<void> => {
    const selectedVersion = versions.find((v) => v.id === selectedVersionId)
    if (!selectedItem || !selectedVersion) return
    const path = await window.electronAPI.getDownloadPath(selectedItem, selectedVersion)
    if (!path) return
    setDownloading(true)
    const res = await window.electronAPI.downloadResource(selectedItem, selectedVersion, path)
    if (res) {
      messageApi.success('下载成功')
      setSelectedItem(null)
    } else {
      messageApi.error('下载失败')
    }
    setDownloading(false)
  }

  return (
    <Flex style={{ height: '100%' }}>
      <Card style={{ width: '100%', overflowY: 'auto' }}>
        <Tabs
          activeKey={selectedType}
          items={tabItems}
          tabBarExtraContent={
            <Space>
              <Input.Search placeholder="搜索地图或扩展" allowClear onSearch={setSearchText} />
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  window.dispatchEvent(reloadEvent)
                }}
              >
                刷新
              </Button>
            </Space>
          }
          onChange={(key) => setSelectedType(key as ItemType)}
        />
      </Card>
      {selectedItem && (
        <Modal
          title={
            <Space direction="vertical">
              <Flex align="baseline" gap="small">
                <Typography.Title level={3} style={{ margin: 0 }}>
                  {selectedItem.name}
                </Typography.Title>
                <Typography.Text type="secondary">{selectedItem.id}</Typography.Text>
              </Flex>
              <Typography.Text type="secondary">
                作者: {selectedItem.authors.join(', ')}
              </Typography.Text>
            </Space>
          }
          open={true}
          closable={false}
          centered
          footer={
            <Flex justify="center" gap="small">
              <Button
                key="download"
                type="primary"
                disabled={versionLoading || !selectedVersionId}
                loading={downloading}
                onClick={handleDownload}
              >
                下载
              </Button>
              <Button key="cancel" onClick={() => setSelectedItem(null)}>
                取消
              </Button>
            </Flex>
          }
        >
          {versionLoading ? (
            <Flex justify="center">
              <Spin />
            </Flex>
          ) : (
            <Select
              style={{ width: '100%' }}
              placeholder="选择版本"
              value={selectedVersionId}
              onChange={setSelectedVersionId}
            >
              {versions.map((v) => (
                <Select.Option key={v.id} value={v.id}>
                  {v.version} ({new Date(v.created_at * 1000).toLocaleDateString()})
                </Select.Option>
              ))}
            </Select>
          )}
        </Modal>
      )}
      {contextHolder}
    </Flex>
  )
}

export default ResourcePage
