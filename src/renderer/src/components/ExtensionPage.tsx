import { useState, useEffect } from 'react'
import type { TransferProps } from 'antd'
import { Alert, Button, Transfer } from 'antd'

import { ExtensionInfo } from 'src/types/extension'

const updateEvent = new Event('update-extensions')

function ExtensionPage(): JSX.Element {
  const [enableChangeFlag, setEnableChangeFlag] = useState<boolean>(false)
  const [extensions, setExtensions] = useState<ExtensionInfo[]>([])
  const [enabledExtensions, setEnabledExtensions] = useState<TransferProps['targetKeys']>([])

  useEffect(() => {
    const updateExtensions = async (): Promise<void> => {
      setExtensions(await window.electronAPI.getExtensionsInfo())
      setEnabledExtensions(await window.electronAPI.getEnabledExtensions())
    }
    const updateSettings = async (): Promise<void> => {
      setEnableChangeFlag(await window.electronAPI.getSetting('auto-enable-extensions'))
    }
    updateExtensions()
    updateSettings()

    window.addEventListener('update-settings', updateSettings)
    window.addEventListener('update-extensions', updateExtensions)
  }, [])

  const onChange: TransferProps['onChange'] = async (nextTargetKeys) => {
    await window.electronAPI.setEnabledExtensions(nextTargetKeys.map((v) => v.toString()))
    setEnabledExtensions(nextTargetKeys)
  }

  const renderFooter: TransferProps['footer'] = (_, info) => {
    if (info?.direction === 'left') {
      return (
        <>
          <Button size="small" type="primary" style={{ margin: 8 }}>
            导入扩展
          </Button>
          <Button
            size="small"
            onClick={() => window.dispatchEvent(updateEvent)}
            style={{ margin: 8 }}
          >
            刷新列表
          </Button>
          <Button
            size="small"
            onClick={window.electronAPI.openExtensionFolder}
            style={{ margin: 8 }}
          >
            打开文件夹
          </Button>
        </>
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
      titles={['未启用', '已启用']}
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
