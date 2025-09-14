import React, { useEffect, useState } from 'react'
import { Card, Form, Input, Button, Row, Col, Select, message, Tabs } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useLocale } from '../contexts/LocaleContext'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

const DistributorAccountSettings: React.FC = () => {
  const { locale, setLocale, t } = useLocale()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form] = Form.useForm()

  useEffect(() => {
    const raw = localStorage.getItem('distributor_account_settings')
    if (raw) {
      const data = JSON.parse(raw)
      form.setFieldsValue(data)
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
      localStorage.setItem('distributor_account_settings', JSON.stringify(values))
      if (values.language && values.language !== locale) {
        setLocale(values.language)
      }
      message.success(t('distributor.accountInfoSaved'))
    } catch (error) {
      console.error('保存失败:', error)
    }
  }

  const onChangePassword = async () => {
    try {
      const { newPassword, confirmPassword } = await form.validateFields(['oldPassword', 'newPassword', 'confirmPassword'])
      if (newPassword !== confirmPassword) {
        message.error(t('distributor.passwordMismatch'))
        return
      }
      // TODO: 接入后端修改密码接口
      form.resetFields(['oldPassword', 'newPassword', 'confirmPassword'])
      message.success(t('distributor.passwordUpdated'))
    } catch (error) {
      console.error('密码修改失败:', error)
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
              {t('distributor.back')}
            </Button>
            <span>{t('distributor.userCenter')}</span>
          </div>
        }
      >
        <Tabs defaultActiveKey="basic">
          <Tabs.TabPane tab={t('distributor.basicInfoSettings')} key="basic">
            <Row gutter={16}>
              <Col xs={24}>
                <Card title={t('distributor.basicInfo')} extra={<Button type="primary" onClick={onSave}>{t('distributor.save')}</Button>}>
                  <Form form={form} layout="vertical">
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="username" label={t('distributor.username')} rules={[{ required: true, message: t('distributor.pleaseEnterUsername') }]}>
                          <Input placeholder={t('distributor.usernamePlaceholder')} disabled />
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
                        <Form.Item name="email" label={t('distributor.email')} rules={[{ type: 'email', message: t('distributor.emailFormatIncorrect') }]}>
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
                        <Form.Item name="company" label={t('distributor.companyName')}>
                          <Input placeholder={t('distributor.companyName')} disabled />
                        </Form.Item>
                      </Col>
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
                    </Row>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="timezone" label={t('distributor.timezoneSettings')} initialValue={'Asia/Shanghai'}>
                          <Select
                            options={[
                              { value: 'Asia/Shanghai', label: t('distributor.beijingTime') },
                              { value: 'Asia/Hong_Kong', label: t('distributor.hongkongTime') },
                              { value: 'UTC', label: t('distributor.utcTime') }
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

          <Tabs.TabPane tab={t('distributor.changePassword')} key="password">
            <Card title={t('distributor.changePassword')}>
              <Form form={form} layout="vertical" style={{ maxWidth: 400 }}>
                <Form.Item name="oldPassword" label={t('distributor.currentPassword')} rules={[{ required: true, message: t('distributor.pleaseEnterCurrentPassword') }]}>
                  <Input.Password placeholder={t('distributor.currentPasswordPlaceholder')} />
                </Form.Item>
                <Form.Item name="newPassword" label={t('distributor.newPassword')} rules={[{ required: true, message: t('distributor.pleaseEnterNewPassword') }, { min: 6, message: t('distributor.passwordMinLength') }]}>
                  <Input.Password placeholder={t('distributor.newPasswordPlaceholder')} />
                </Form.Item>
                <Form.Item name="confirmPassword" label={t('distributor.confirmNewPassword')} dependencies={["newPassword"]} rules={[{ required: true, message: t('distributor.pleaseEnterNewPasswordAgain') }]}>
                  <Input.Password placeholder={t('distributor.confirmNewPasswordPlaceholder')} />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" onClick={onChangePassword} style={{ width: '100%' }}>
                    {t('distributor.changePasswordButton')}
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
