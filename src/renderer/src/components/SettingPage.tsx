import { useState, useEffect } from 'react'
import { EditOutlined, FolderOpenOutlined, ReloadOutlined } from '@ant-design/icons'
import { blue, cyan, gold, gray, green, orange, purple, red } from '@ant-design/colors'
import type { ColorPickerProps, DescriptionsProps } from 'antd'
import {
  Button,
  Card,
  ColorPicker,
  Descriptions,
  Form,
  Input,
  Radio,
  Space,
  Switch,
  Spin,
  Divider
} from 'antd'

import { Settings } from 'src/types/settings'

const updateEvent = new Event('update-mainwindow')

const languageOptions = [
  // { label: 'English', value: 'enUS' },
  { label: '简体中文', value: 'zhCN' }
]

const themeOptions = [
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
  { label: '跟随系统', value: 'auto' }
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
    window.addEventListener('update-mainwindow', async () => {
      const newSettings = await window.electronAPI.getSettings()
      setSettings(newSettings)
      form.setFieldsValue(newSettings)
    })
    window.dispatchEvent(updateEvent)
  }, [])

  const onChangeSettings = async (changedSettings: Partial<Settings>): Promise<void> => {
    await window.electronAPI.changeSettings(changedSettings)
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
          label="自动最小化主窗口"
          extra="游戏启动后自动最小化主窗口"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          name="auto-reload-map"
          label="自动重载地图"
          extra="地图/扩展文件发生变化时自动重新加载地图"
        >
          <Switch />
        </Form.Item>
      </Card>
      <Card title="扩展设置">
        <Form.Item
          name="auto-enable-extensions"
          label="自动启用扩展"
          extra="根据地图文件的配置自动启用/禁用扩展"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          name="check-extensions"
          label="扩展检测"
          extra={
            <>
              检测地图文件所需的扩展是否启用且匹配版本号
              <br />
              注：不检测手动导入的多余扩展
            </>
          }
        >
          <Switch />
        </Form.Item>
        <Form.Item name="extensions-save-path" label="扩展存储路径">
          <Input
            readOnly
            addonAfter={
              <Space size={2} split={<Divider type="vertical" />}>
                <EditOutlined
                  onClick={() =>
                    window.electronAPI
                      .chooseExtensionFolder()
                      .then(() => window.dispatchEvent(updateEvent))
                  }
                />
                <FolderOpenOutlined onClick={window.electronAPI.openExtensionFolder} />
                <ReloadOutlined onClick={() => onChangeSettings({ 'extensions-save-path': '' })} />
              </Space>
            }
          />
        </Form.Item>
      </Card>
      <Card title="个性化">
        <Form.Item name="language" label="语言">
          <Radio.Group options={languageOptions} optionType="button" />
        </Form.Item>
        <Form.Item name="theme" label="主题样式">
          <Radio.Group options={themeOptions} optionType="button" />
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
