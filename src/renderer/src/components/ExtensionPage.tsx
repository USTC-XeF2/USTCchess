import { useState } from 'react'
import type { TransferProps } from 'antd'
import { Alert, Button, Transfer } from 'antd'

interface RecordType {
  key: string
  title: string
  disabled: boolean
}

let initialEnableChangeFlag: boolean
let initialExtensions: RecordType[]
let initialTargetKeys: Array<string>

window.addEventListener('DOMContentLoaded', async () => {
  initialEnableChangeFlag = await window.electronAPI.getSetting('auto-enable-extensions')
  initialExtensions = await window.electronAPI.getExtensions()
  initialTargetKeys = []
})

function ExtensionPage(): JSX.Element {
  const [initialized, setInitialized] = useState<boolean>(false)
  const [enableChangeFlag, setEnableChangeFlag] = useState<boolean>(initialEnableChangeFlag)
  const [extensions, setExtensions] = useState<RecordType[]>(initialExtensions)
  const [targetKeys, setTargetKeys] = useState<TransferProps['targetKeys']>(initialTargetKeys)

  if (!initialized) {
    window.addEventListener('updatesettings', async () => {
      setEnableChangeFlag(await window.electronAPI.getSetting('auto-enable-extensions'))
      setExtensions(await window.electronAPI.getExtensions())
      console.log(1)
    })
    setInitialized(true)
  }

  const onChange: TransferProps['onChange'] = (nextTargetKeys) => {
    setTargetKeys(nextTargetKeys)
  }

  const renderFooter: TransferProps['footer'] = (_, info) => {
    if (info?.direction === 'left') {
      return (
        <>
          <Button size="small" type="primary" ghost style={{ margin: 8 }}>
            导入扩展
          </Button>
          <Button size="small" danger style={{ margin: 8 }}>
            移除所选扩展
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
      targetKeys={targetKeys}
      onChange={onChange}
      render={(item) => item.title}
      footer={renderFooter}
      oneWay
      pagination
      style={{ height: '100%' }}
      listStyle={{ width: '100%', margin: 10 }}
    />
  )
}

export default ExtensionPage
