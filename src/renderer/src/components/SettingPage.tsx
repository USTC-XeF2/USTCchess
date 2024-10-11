import { blue, green, presetPalettes, purple, orange } from '@ant-design/colors'
import type { ColorPickerProps } from 'antd'
import { Button, Card, ColorPicker, Form, Radio, Space, Switch } from 'antd'

const versions = window.electronAPI.versions
const event = new Event('updatesettings')

const languageOptions = [
  { label: 'English', value: 'enUS' },
  { label: '简体中文', value: 'zhCN' }
]

type Presets = Required<ColorPickerProps>['presets'][number]

const genPresets = (presets = presetPalettes): Array<Presets> =>
  Object.entries(presets).map<Presets>(([label, colors]) => ({ label, colors, defaultOpen: false }))

let settings: object

window.addEventListener('DOMContentLoaded', async () => {
  window.dispatchEvent(event)
  settings = await window.electronAPI.getSettings()
})

function SettingPage(): JSX.Element {
  const [form] = Form.useForm()

  const onChangeSettings = async (changedValues: object): Promise<void> => {
    await window.electronAPI.changeSettings(changedValues)
    window.dispatchEvent(event)
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
        <Form.Item name="language" label="语言">
          <Radio.Group options={languageOptions} optionType="button" />
        </Form.Item>
        <Form.Item label="主题色">
          <Space>
            <ColorPicker
              presets={genPresets({ blue, green, purple, orange })}
              defaultValue={settings['primary-color']}
              disabledAlpha
              onChangeComplete={(color) =>
                onChangeSettings({ 'primary-color': color.toHexString() })
              }
            />
            <Button onClick={() => onChangeSettings({ 'primary-color': '#1677ff' })}>重置</Button>
          </Space>
        </Form.Item>
      </Card>
      <Card title="程序版本信息">
        <ul className="versions">
          <li className="electron-version">Electron v{versions.electron}</li>
          <li className="chrome-version">Chromium v{versions.chrome}</li>
          <li className="node-version">Node v{versions.node}</li>
        </ul>
      </Card>
    </Form>
  )
}

export default SettingPage
