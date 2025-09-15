import React, { useEffect, useState } from 'react'
import { Card, Form, Input, Button, Row, Col, message, Tabs } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useLocale } from '../contexts/LocaleContext'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import apiService from '../services/api'

const DistributorAccountSettings: React.FC = () => {
  const { t } = useLocale()
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [form] = Form.useForm()

  useEffect(() => {
    const raw = localStorage.getItem('distributor_account_settings')
    if (raw) {
      const data = JSON.parse(raw)
      form.setFieldsValue(data)
    } else {
      // 设置默认值，使用分判商信息
      form.setFieldsValue({
        username: user?.username || '',
        displayName: user?.distributor?.contactName || user?.username || '',
        company: user?.distributor?.name || '', // 使用分判商名称作为公司名称
        phone: user?.distributor?.phone || '', // 使用分判商电话
        email: user?.distributor?.email || '', // 使用分判商邮箱
        whatsapp: user?.distributor?.whatsapp || '' // 使用分判商WhatsApp
      })
    }
  }, [form, user])

  const onSave = async () => {
    try {
      const values = await form.validateFields()
      
      // 调用后端API更新分判商资料
      const updateData = {
        name: values.company, // 公司名称对应分判商名称
        contactName: values.displayName, // 显示名称对应联系人
        phone: values.phone,
        email: values.email,
        whatsapp: values.whatsapp
      }
      
      await apiService.updateDistributorProfile(updateData)
      
      // 刷新用户信息以更新右上角显示
      await refreshUser()
      
      // 保存到本地存储
      localStorage.setItem('distributor_account_settings', JSON.stringify(values))
      
      message.success(t('distributor.accountInfoSaved'))
    } catch (error: unknown) {
      console.error('保存失败:', error)
      
      // 显示具体错误信息
      let errorMessage = t('distributor.operationFailed')
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMsg = (error as { message: string }).message
        if (errorMsg && errorMsg !== '操作失败') {
          errorMessage = errorMsg
        }
      }
      
      message.error(errorMessage)
    }
  }

  const onChangePassword = async () => {
    try {
      const { oldPassword, newPassword, confirmPassword } = await form.validateFields(['oldPassword', 'newPassword', 'confirmPassword'])
      
      if (newPassword !== confirmPassword) {
        message.error(t('distributor.passwordMismatch'))
        return
      }
      
      // 调用后端API修改密码
      await apiService.changePassword(oldPassword, newPassword)
      
      // 清空密码字段
      form.resetFields(['oldPassword', 'newPassword', 'confirmPassword'])
      message.success(t('distributor.passwordUpdated'))
    } catch (error: unknown) {
      console.error('密码修改失败:', error)
      
      // 显示具体错误信息
      let errorMessage = t('distributor.operationFailed')
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMsg = (error as { message: string }).message
        if (errorMsg && errorMsg !== '操作失败') {
          errorMessage = errorMsg
        }
      }
      
      message.error(errorMessage)
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
                        <Form.Item name="whatsapp" label={t('distributor.whatsapp')}>
                          <Input placeholder={t('distributor.whatsappPlaceholder')} />
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
