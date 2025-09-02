import React, { useEffect, useState } from 'react'
import { Card, Form, Input, Button, Upload, Avatar, Row, Col, Select, message, Divider } from 'antd'
import { UploadOutlined, UserOutlined } from '@ant-design/icons'
import { useLocale } from '../contexts/LocaleContext'

const AccountSettings: React.FC = () => {
  const { locale, setLocale } = useLocale()
  const [form] = Form.useForm()
  const [avatarUrl, setAvatarUrl] = useState<string>('')

  useEffect(() => {
    const raw = localStorage.getItem('account_settings')
    if (raw) {
      const data = JSON.parse(raw)
      form.setFieldsValue(data)
      if (data.avatarUrl) setAvatarUrl(data.avatarUrl)
    }
  }, [form])

  const onSave = async () => {
    const values = await form.validateFields()
    localStorage.setItem('account_settings', JSON.stringify({ ...values, avatarUrl }))
    if (values.language && values.language !== locale) setLocale(values.language)
    message.success('账户信息已保存')
  }

  const onChangePassword = async () => {
    const { oldPassword, newPassword, confirmPassword } = await form.validateFields(['oldPassword', 'newPassword', 'confirmPassword'])
    if (newPassword !== confirmPassword) {
      message.error('两次输入的新密码不一致')
      return
    }
    // TODO: 接入后端修改密码接口
    form.resetFields(['oldPassword', 'newPassword', 'confirmPassword'])
    message.success('密码已更新')
  }

  const uploadProps = {
    name: 'file',
    showUploadList: false,
    customRequest: (options: any) => {
      // demo：直接生成本地预览地址
      const file = options.file as File
      const reader = new FileReader()
      reader.onload = () => {
        const url = reader.result as string
        setAvatarUrl(url)
        options.onSuccess({}, file)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={16}>
        <Col xs={24} lg={8}>
          <Card title="头像">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Avatar size={80} src={avatarUrl} icon={<UserOutlined />} />
              <Upload {...uploadProps}>
                <Button icon={<UploadOutlined />}>上传头像</Button>
              </Upload>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card title="基本信息" extra={<Button type="primary" onClick={onSave}>保存</Button>}>
            <Form form={form} layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
                    <Input placeholder="用户名" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="displayName" label="显示名称">
                    <Input placeholder="显示在界面的名称" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="email" label="邮箱" rules={[{ type: 'email', message: '邮箱格式不正确' }]}>
                    <Input placeholder="邮箱" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="phone" label="电话">
                    <Input placeholder="电话" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="language" label="界面语言" initialValue={locale}>
                    <Select
                      options={[
                        { value: 'zh-CN', label: '简体中文' },
                        { value: 'zh-TW', label: '香港繁体' },
                        { value: 'en-US', label: 'English' }
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="theme" label="主题风格" initialValue={'light'}>
                    <Select
                      options={[
                        { value: 'light', label: '浅色' },
                        { value: 'dark', label: '深色' }
                      ]}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
        </Col>
      </Row>

      <Divider />

      <Row gutter={16}>
        <Col xs={24} lg={12}>
          <Card title="修改密码" extra={<Button onClick={onChangePassword}>更新密码</Button>}>
            <Form form={form} layout="vertical">
              <Form.Item name="oldPassword" label="当前密码" rules={[{ required: true, message: '请输入当前密码' }]}>
                <Input.Password placeholder="当前密码" />
              </Form.Item>
              <Form.Item name="newPassword" label="新密码" rules={[{ required: true, message: '请输入新密码' }, { min: 6, message: '至少6位' }]}>
                <Input.Password placeholder="新密码" />
              </Form.Item>
              <Form.Item name="confirmPassword" label="确认新密码" dependencies={["newPassword"]} rules={[{ required: true, message: '请再次输入新密码' }]}>
                <Input.Password placeholder="确认新密码" />
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default AccountSettings


