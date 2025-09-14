import React, { useEffect, useState } from 'react'
import { Card, Form, Input, Button, Row, Col, Select, message, Tabs } from 'antd'
import { useLocale } from '../contexts/LocaleContext'
import { apiService } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

const AccountSettings: React.FC = () => {
  const { locale, setLocale, t } = useLocale()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [passwordForm] = Form.useForm()

  useEffect(() => {
    const raw = localStorage.getItem('account_settings')
    if (raw) {
      const data = JSON.parse(raw)
      form.setFieldsValue(data)
    }
  }, [form])

  const onSave = async () => {
    const values = await form.validateFields()
    localStorage.setItem('account_settings', JSON.stringify(values))
    if (values.language && values.language !== locale) setLocale(values.language)
    message.success(t('distributor.accountInfoSaved'))
  }

  const onChangePassword = async () => {
    try {
      const { oldPassword, newPassword, confirmPassword } = await passwordForm.validateFields()
      
      if (newPassword !== confirmPassword) {
        message.error(t('distributor.passwordMismatch'))
        return
      }

      // 调用后端API修改密码
      await apiService.changePassword(oldPassword, newPassword)
      
      message.success(t('distributor.passwordUpdated'))
      passwordForm.resetFields()
      
      // 密码修改成功后，清除用户会话并跳转到登录页
      setTimeout(() => {
        logout()
        navigate('/login')
      }, 2000)
      
    } catch (error: any) {
      console.error('密码修改失败:', error)
      if (error.message?.includes('当前密码错误')) {
        message.error('当前密码错误，请重新输入')
      } else if (error.message?.includes('新密码长度至少6位')) {
        message.error('新密码长度至少6位')
      } else {
        message.error('密码修改失败，请重试')
      }
    }
  }


  return (
    <div style={{ padding: 24 }}>
      <Card title={t('guard.userCenter')}>
        <Tabs defaultActiveKey="basic">
          <Tabs.TabPane tab={t('distributor.basicInfoSettings')} key="basic">
            <Row gutter={16}>
              <Col xs={24}>
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
                  <Form form={passwordForm} layout="vertical">
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


