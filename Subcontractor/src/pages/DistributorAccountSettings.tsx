import React, { useEffect, useState } from 'react'
import { Card, Form, Input, Button, Upload, Avatar, Row, Col, Select, message, Tabs } from 'antd'
import { UploadOutlined, UserOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useLocale } from '../contexts/LocaleContext'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

const DistributorAccountSettings: React.FC = () => {
  const { locale, setLocale } = useLocale()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [avatarUrl, setAvatarUrl] = useState<string>('')

  useEffect(() => {
    const raw = localStorage.getItem('distributor_account_settings')
    if (raw) {
      const data = JSON.parse(raw)
      form.setFieldsValue(data)
      if (data.avatarUrl) setAvatarUrl(data.avatarUrl)
    } else {
      // 设置默认值
      form.setFieldsValue({
        username: user?.username || '',
        displayName: user?.username || '',
        language: locale
      })
    }
  }, [form, user, locale])

  const onSave = async () => {
    try {
      const values = await form.validateFields()
      localStorage.setItem('distributor_account_settings', JSON.stringify({ ...values, avatarUrl }))
      if (values.language && values.language !== locale) {
        setLocale(values.language)
      }
      message.success('账户信息已保存')
    } catch (error) {
      console.error('保存失败:', error)
    }
  }

  const onChangePassword = async () => {
    try {
      const { newPassword, confirmPassword } = await form.validateFields(['oldPassword', 'newPassword', 'confirmPassword'])
      if (newPassword !== confirmPassword) {
        message.error('两次输入的新密码不一致')
        return
      }
      // TODO: 接入后端修改密码接口
      form.resetFields(['oldPassword', 'newPassword', 'confirmPassword'])
      message.success('密码已更新')
    } catch (error) {
      console.error('密码修改失败:', error)
    }
  }

  const uploadProps = {
    name: 'file',
    showUploadList: false,
    accept: 'image/*',
    customRequest: (options: any) => {
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

  const handleGoBack = () => {
    navigate('/distributor/workers')
  }

  return (
    <div style={{ padding: 24 }}>
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />} 
              onClick={handleGoBack}
              style={{ padding: '4px 8px' }}
            >
              返回
            </Button>
            <span>用户中心</span>
          </div>
        }
      >
        <Tabs defaultActiveKey="basic">
          <Tabs.TabPane tab="基本信息设置" key="basic">
            <Row gutter={16}>
              <Col xs={24} lg={8}>
                <Card title="头像设置">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Avatar size={80} src={avatarUrl} icon={<UserOutlined />} />
                    <div>
                      <Upload {...uploadProps}>
                        <Button icon={<UploadOutlined />}>上传头像</Button>
                      </Upload>
                      <div style={{ marginTop: 8, fontSize: '12px', color: '#999' }}>
                        支持 JPG、PNG 格式，建议尺寸 200x200
                      </div>
                    </div>
                  </div>
                </Card>
              </Col>
              <Col xs={24} lg={16}>
                <Card title="基本信息" extra={<Button type="primary" onClick={onSave}>保存</Button>}>
                  <Form form={form} layout="vertical">
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
                          <Input placeholder="用户名" disabled />
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
                          <Input placeholder="邮箱地址" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="phone" label="联系电话">
                          <Input placeholder="联系电话" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="company" label="公司名称">
                          <Input placeholder="公司名称" disabled />
                        </Form.Item>
                      </Col>
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
                    </Row>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="theme" label="主题风格" initialValue={'light'}>
                          <Select
                            options={[
                              { value: 'light', label: '浅色主题' },
                              { value: 'dark', label: '深色主题' }
                            ]}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="timezone" label="时区设置" initialValue={'Asia/Shanghai'}>
                          <Select
                            options={[
                              { value: 'Asia/Shanghai', label: '北京时间 (UTC+8)' },
                              { value: 'Asia/Hong_Kong', label: '香港时间 (UTC+8)' },
                              { value: 'UTC', label: '协调世界时 (UTC+0)' }
                            ]}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Form>
                </Card>
              </Col>
            </Row>
          </Tabs.TabPane>

          <Tabs.TabPane tab="修改密码" key="password">
            <Card title="修改密码">
              <Form form={form} layout="vertical" style={{ maxWidth: 400 }}>
                <Form.Item name="oldPassword" label="当前密码" rules={[{ required: true, message: '请输入当前密码' }]}>
                  <Input.Password placeholder="请输入当前密码" />
                </Form.Item>
                <Form.Item name="newPassword" label="新密码" rules={[{ required: true, message: '请输入新密码' }, { min: 6, message: '密码至少6位' }]}>
                  <Input.Password placeholder="请输入新密码" />
                </Form.Item>
                <Form.Item name="confirmPassword" label="确认新密码" dependencies={["newPassword"]} rules={[{ required: true, message: '请再次输入新密码' }]}>
                  <Input.Password placeholder="请再次输入新密码" />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" onClick={onChangePassword} style={{ width: '100%' }}>
                    修改密码
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Tabs.TabPane>
        </Tabs>
      </Card>

    </div>
  )
}

export default DistributorAccountSettings
