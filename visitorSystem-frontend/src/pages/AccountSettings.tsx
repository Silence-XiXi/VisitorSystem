import React, { useEffect, useState } from 'react'
import { Card, Form, Input, Button, Upload, Avatar, Row, Col, Select, message, Tabs } from 'antd'
import { UploadOutlined, UserOutlined } from '@ant-design/icons'
import { useLocale } from '../contexts/LocaleContext'

const AccountSettings: React.FC = () => {
  const { locale, setLocale, t } = useLocale()
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
    message.success(t('distributor.accountInfoSaved'))
  }

  const onChangePassword = async () => {
    const { newPassword, confirmPassword } = await form.validateFields(['oldPassword', 'newPassword', 'confirmPassword'])
    if (newPassword !== confirmPassword) {
      message.error(t('distributor.passwordMismatch'))
      return
    }
    // TODO: 接入后端修改密码接口
    form.resetFields(['oldPassword', 'newPassword', 'confirmPassword'])
    message.success(t('distributor.passwordUpdated'))
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
      <Card title={t('guard.userCenter')}>
        <Tabs defaultActiveKey="basic">
          <Tabs.TabPane tab={t('distributor.basicInfoSettings')} key="basic">
            <Row gutter={16}>
              <Col xs={24} lg={8}>
                <Card title={t('distributor.avatarSettings')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Avatar size={80} src={avatarUrl} icon={<UserOutlined />} />
                    <Upload {...uploadProps}>
                      <Button icon={<UploadOutlined />}>{t('guard.uploadAvatar')}</Button>
                    </Upload>
                  </div>
                </Card>
              </Col>
              <Col xs={24} lg={16}>
                <Card title={t('distributor.basicInfo')} extra={<Button type="primary" onClick={onSave}>{t('common.save')}</Button>}>
                  <Form form={form} layout="vertical">
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="username" label={t('distributor.username')} rules={[{ required: true, message: t('distributor.pleaseEnterUsername') }]}>
                          <Input placeholder={t('distributor.username')} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="displayName" label={t('distributor.displayName')}>
                          <Input placeholder={t('distributor.displayNamePlaceholder')} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="email" label={t('distributor.email')} rules={[{ type: 'email', message: t('form.invalidEmail') }]}>
                          <Input placeholder={t('distributor.emailPlaceholder')} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="phone" label={t('distributor.phone')}>
                          <Input placeholder={t('distributor.phonePlaceholder')} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="language" label={t('distributor.interfaceLanguage')} initialValue={locale}>
                          <Select
                            options={[
                              { value: 'zh-CN', label: t('languages.zhCN') },
                              { value: 'zh-TW', label: t('languages.zhTW') },
                              { value: 'en-US', label: t('languages.enUS') }
                            ]}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="theme" label={t('distributor.themeStyle')} initialValue={'light'}>
                          <Select
                            options={[
                              { value: 'light', label: t('guard.lightTheme') },
                              { value: 'dark', label: t('guard.darkTheme') }
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

          <Tabs.TabPane tab={t('guard.changePassword')} key="password">
            <Row gutter={16}>
              <Col xs={24} lg={12}>
                <Card title={t('guard.changePassword')} extra={<Button onClick={onChangePassword}>{t('guard.updatePassword')}</Button>}>
                  <Form form={form} layout="vertical">
                    <Form.Item name="oldPassword" label={t('distributor.currentPassword')} rules={[{ required: true, message: t('distributor.pleaseEnterCurrentPassword') }]}>
                      <Input.Password placeholder={t('distributor.currentPasswordPlaceholder')} />
                    </Form.Item>
                    <Form.Item name="newPassword" label={t('distributor.newPassword')} rules={[{ required: true, message: t('distributor.pleaseEnterNewPassword') }, { min: 6, message: t('distributor.passwordMinLength') }]}>
                      <Input.Password placeholder={t('distributor.newPasswordPlaceholder')} />
                    </Form.Item>
                    <Form.Item name="confirmPassword" label={t('distributor.confirmNewPassword')} dependencies={["newPassword"]} rules={[{ required: true, message: t('distributor.pleaseEnterNewPasswordAgain') }]}>
                      <Input.Password placeholder={t('distributor.confirmNewPasswordPlaceholder')} />
                    </Form.Item>
                  </Form>
                </Card>
              </Col>
            </Row>
          </Tabs.TabPane>
        </Tabs>
      </Card>
    </div>
  )
}

export default AccountSettings


