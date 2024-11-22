import { useState, useEffect } from 'react'
import { ReloadOutlined, SelectOutlined } from '@ant-design/icons'
import type { TransferProps } from 'antd'
import { Alert, Button, Flex, Transfer } from 'antd'

import { ExtensionInfo } from 'src/types/extension'

const updateEvent = new Event('update-mainwindow')

function ExtensionPage(): JSX.Element {
  const [enableChangeFlag, setEnableChangeFlag] = useState<boolean>(false)
  const [extensions, setExtensions] = useState<ExtensionInfo[]>([])
  const [enabledExtensions, setEnabledExtensions] = useState<TransferProps['targetKeys']>([])

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      setEnableChangeFlag(await window.electronAPI.getSetting('auto-enable-extensions'))
      setExtensions(await window.electronAPI.getExtensionsInfo())
      setEnabledExtensions(await window.electronAPI.getEnabledExtensions())
    }
    fetchData()

    window.addEventListener('update-mainwindow', fetchData)
  }, [])

  const onChange: TransferProps['onChange'] = async (nextTargetKeys) => {
    await window.electronAPI.setEnabledExtensions(nextTargetKeys.map((v) => v.toString()))
    setEnabledExtensions(nextTargetKeys)
  }

  const renderFooter: TransferProps['footer'] = (_, info) => {
    if (info?.direction === 'left') {
      return (
        <Flex justify="space-between">
          <Button
            size="small"
            type="primary"
            icon={<SelectOutlined />}
            iconPosition="end"
            onClick={() => {
              window.electronAPI.importExtensions().then(() => {
                window.dispatchEvent(updateEvent)
              })
            }}
            style={{ margin: 8 }}
          >
            导入扩展
          </Button>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            iconPosition="end"
            onClick={() => window.dispatchEvent(updateEvent)}
            style={{ margin: 8 }}
          >
            刷新
          </Button>
        </Flex>
      )
    } else {
      return (
        <>
          {enableChangeFlag && (
            <Alert message="自动启用扩展模式已启用" type="info" showIcon closable />
          )}
        </>
      )
    }
  }

  return (
    <Transfer
      dataSource={extensions.map((value) => ({ ...value, disabled: enableChangeFlag }))}
      titles={[enableChangeFlag ? '自动启用扩展' : '未启用', '已启用']}
      operations={['启用扩展']}
      targetKeys={enabledExtensions}
      onChange={onChange}
      render={(item) => `[${item.name}] ${item.key} v${item.version}`}
      footer={renderFooter}
      oneWay
      pagination
      style={{ height: '100%' }}
      listStyle={{ width: '100%', margin: 10 }}
    />
  )
}

export default ExtensionPage
