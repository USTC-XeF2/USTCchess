import { useState, useEffect } from 'react'
import { blue, cyan, gold, gray, green, orange, purple, red } from '@ant-design/colors'
import type { ColorPickerProps, DescriptionsProps } from 'antd'
import { Button, Card, ColorPicker, Descriptions, Form, Radio, Space, Switch, Spin } from 'antd'

import { Settings } from 'src/types/settings'

const updateEvent = new Event('updatesettings')

const languageOptions = [
  { label: 'English', value: 'enUS' },
  { label: '简体中文', value: 'zhCN' }
]

const presetColors: ColorPickerProps['presets'] = [
  {
    label: '经典主题',
    colors: [red, orange, gold, green, cyan, blue, purple, gray].map((color) => color.primary!),
    defaultOpen: true
  }
]

const about = window.electronAPI.getAbout()
const aboutInformation: DescriptionsProps['items'] = [
  {
    label: '版本',
    children: about['app-version']
  },
  {
    label: 'Electron',
    children: about['electron-version']
  },
  {
    label: 'Chromium',
    children: about['chrome-version']
  },
  {
    label: 'Node.js',
    children: about['node-version']
  },
  {
    label: 'OS',
    children: `${about['platform']} ${about['sys-version']}`
  }
]

function SettingPage(): JSX.Element {
  const [settings, setSettings] = useState<Settings>()
  const [form] = Form.useForm<Settings>()

  useEffect(() => {
    const fetchSettings = async (): Promise<void> => {
      setSettings(await window.electronAPI.getSettings())
      window.dispatchEvent(updateEvent)
    }
    fetchSettings()
  }, [])

  const onChangeSettings = async (changedSettings: Partial<Settings>): Promise<void> => {
    setSettings(await window.electronAPI.changeSettings(changedSettings))
    window.dispatchEvent(updateEvent)
  }

  if (!settings) {
    return <Spin tip="加载中..." fullscreen delay={10} />
  }

  return (
    <Form form={form} initialValues={settings} onValuesChange={onChangeSettings}>
      <Card title="游戏设置">
        <Form.Item
          name="auto-minimize-mainwindow"
          label="自动最小化窗口"
          extra="游戏启动后自动最小化主窗口"
        >
          <Switch />
        </Form.Item>
      </Card>
      <Card title="扩展设置">
        <Form.Item
          name="auto-enable-extensions"
          label="自动启用扩展"
          extra="根据地图文件的配置自动启用/禁用扩展，此时“扩展”栏的选择无效"
        >
          <Switch />
        </Form.Item>
      </Card>
      <Card title="个性化">
        <Form.Item name="language" label="语言" extra="目前只支持极少部分组件">
          <Radio.Group options={languageOptions} optionType="button" />
        </Form.Item>
        <Form.Item label="主题色">
          <Space>
            <ColorPicker
              presets={presetColors}
              value={settings['primary-color']}
              disabledAlpha
              onChangeComplete={(color) =>
                onChangeSettings({ 'primary-color': color.toHexString() })
              }
            />
            <Button onClick={() => onChangeSettings({ 'primary-color': '#1677ff' })}>重置</Button>
          </Space>
        </Form.Item>
      </Card>
      <Card title="关于">
        <Descriptions items={aboutInformation} />
      </Card>
    </Form>
  )
}

export default SettingPage
