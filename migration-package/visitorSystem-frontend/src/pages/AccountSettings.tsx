import React, { useEffect, useState, useCallback } from 'react'
import { Card, Form, Input, Button, Row, Col, message, Tabs, Tag } from 'antd'
import { useLocale } from '../contexts/LocaleContext'
import { apiService } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { 
  MailOutlined, 
  WhatsAppOutlined, 
  UserOutlined, 
  DatabaseOutlined, 
  ToolOutlined, 
  LockOutlined, 
  PhoneOutlined, 
  EyeInvisibleOutlined, 
  EyeOutlined,
  EditOutlined
} from '@ant-design/icons'

const AccountSettings: React.FC = () => {
  const { t } = useLocale()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [passwordForm] = Form.useForm()
  const [emailForm] = Form.useForm()
  const [whatsappForm] = Form.useForm()
  
  // 通讯配置状态
  const [loading, setLoading] = useState(false)
  const [emailPasswordVisible, setEmailPasswordVisible] = useState(false)
  const [whatsappTokenVisible, setWhatsappTokenVisible] = useState(false)
  const [emailEditing, setEmailEditing] = useState(false)
  const [whatsappEditing, setWhatsappEditing] = useState(false)
  const [originalEmailValues, setOriginalEmailValues] = useState<Record<string, string>>({})
  const [originalWhatsappValues, setOriginalWhatsappValues] = useState<Record<string, string>>({})
  const [emailConfigStatus, setEmailConfigStatus] = useState<'configured' | 'not_configured'>('not_configured')
  const [whatsappConfigStatus, setWhatsappConfigStatus] = useState<'configured' | 'not_configured'>('not_configured')

  // 检测邮箱配置状态
  const checkEmailConfigStatus = (configs: Record<string, string>): boolean => {
    const requiredFields = ['EMAIL_ADDRESS', 'EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_PASSWORD']
    return requiredFields.every(field => {
      const value = configs[field]
      return value && value !== '••••••••' && value.trim() !== ''
    })
  }

  // 检测WhatsApp配置状态
  const checkWhatsappConfigStatus = (configs: Record<string, string>): boolean => {
    const requiredFields = ['WHATSAPP_SENDER_NUMBER', 'WHATSAPP_API_TOKEN', 'WHATSAPP_TEMPLATE_NAME']
    return requiredFields.every(field => {
      const value = configs[field]
      return value && value !== '••••••••' && value.trim() !== ''
    })
  }

  // 加载通讯配置
  const loadCommunicationConfigs = useCallback(async () => {
    try {
      setLoading(true)
      const configs = await apiService.getSystemConfigs()
      
      // 获取加密字段的解密值
      let emailPassword = '••••••••'
      let whatsappToken = '••••••••'
      
      try {
        emailPassword = await apiService.getDecryptedSystemConfig('EMAIL_PASSWORD')
      } catch (error) {
        console.log('获取邮箱密码失败，使用默认值')
      }
      
      try {
        whatsappToken = await apiService.getDecryptedSystemConfig('WHATSAPP_API_TOKEN')
      } catch (error) {
        console.log('获取WhatsApp Token失败，使用默认值')
      }
      
      // 处理邮箱配置
      const emailConfigs = {
        EMAIL_ADDRESS: configs.find(c => c.config_key === 'EMAIL_ADDRESS')?.config_value || 'notifications@example.com',
        EMAIL_HOST: configs.find(c => c.config_key === 'EMAIL_HOST')?.config_value || 'smtp.example.com',
        EMAIL_PORT: configs.find(c => c.config_key === 'EMAIL_PORT')?.config_value || '587',
        EMAIL_PASSWORD: emailPassword
      }
      
      // 处理WhatsApp配置
      const whatsappConfigs = {
        WHATSAPP_SENDER_NUMBER: configs.find(c => c.config_key === 'WHATSAPP_SENDER_NUMBER')?.config_value || '+12345678901',
        WHATSAPP_API_TOKEN: whatsappToken,
        WHATSAPP_TEMPLATE_NAME: configs.find(c => c.config_key === 'WHATSAPP_TEMPLATE_NAME')?.config_value || 'visitor_notification'
      }
      
      emailForm.setFieldsValue(emailConfigs)
      whatsappForm.setFieldsValue(whatsappConfigs)
      
      // 保存原始值用于取消编辑时恢复
      setOriginalEmailValues(emailConfigs)
      setOriginalWhatsappValues(whatsappConfigs)
      
      // 检测配置状态
      const emailConfigured = checkEmailConfigStatus(emailConfigs)
      const whatsappConfigured = checkWhatsappConfigStatus(whatsappConfigs)
      
      setEmailConfigStatus(emailConfigured ? 'configured' : 'not_configured')
      setWhatsappConfigStatus(whatsappConfigured ? 'configured' : 'not_configured')
      
    } catch (error) {
      console.error('加载通讯配置失败:', error)
      message.error(t('systemConfig.emailConfig.loadError'))
    } finally {
      setLoading(false)
    }
  }, [emailForm, whatsappForm, t])

  useEffect(() => {
    const raw = localStorage.getItem('account_settings')
    if (raw) {
      const data = JSON.parse(raw)
      form.setFieldsValue(data)
    }
    loadCommunicationConfigs()
  }, [form, loadCommunicationConfigs])


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
      
    } catch (error: unknown) {
      console.error('密码修改失败:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('当前密码错误')) {
        message.error('当前密码错误，请重新输入')
      } else if (errorMessage.includes('新密码长度至少6位')) {
        message.error('新密码长度至少6位')
      } else {
        message.error('密码修改失败，请重试')
      }
    }
  }

  // 保存邮箱配置
  const onSaveEmailConfig = async () => {
    try {
      const values = await emailForm.validateFields()
      
      await Promise.all([
        apiService.updateSystemConfig('EMAIL_ADDRESS', values.EMAIL_ADDRESS),
        apiService.updateSystemConfig('EMAIL_HOST', values.EMAIL_HOST),
        apiService.updateSystemConfig('EMAIL_PORT', values.EMAIL_PORT),
        apiService.updateSystemConfig('EMAIL_PASSWORD', values.EMAIL_PASSWORD, true)
      ])
      
      message.success(t('systemConfig.emailConfig.saveSuccess'))
      setEmailEditing(false)
      setEmailPasswordVisible(false) // 保存后隐藏密码
      await loadCommunicationConfigs()
    } catch (error) {
      console.error('保存邮箱配置失败:', error)
      message.error(t('systemConfig.emailConfig.saveError'))
    }
  }

  // 保存WhatsApp配置
  const onSaveWhatsappConfig = async () => {
    try {
      const values = await whatsappForm.validateFields()
      
      await Promise.all([
        apiService.updateSystemConfig('WHATSAPP_SENDER_NUMBER', values.WHATSAPP_SENDER_NUMBER),
        apiService.updateSystemConfig('WHATSAPP_API_TOKEN', values.WHATSAPP_API_TOKEN, true),
        apiService.updateSystemConfig('WHATSAPP_TEMPLATE_NAME', values.WHATSAPP_TEMPLATE_NAME)
      ])
      
      message.success(t('systemConfig.whatsappConfig.saveSuccess'))
      setWhatsappEditing(false)
      setWhatsappTokenVisible(false) // 保存后隐藏Token
      await loadCommunicationConfigs()
    } catch (error) {
      console.error('保存WhatsApp配置失败:', error)
      message.error(t('systemConfig.whatsappConfig.saveError'))
    }
  }


  return (
    <div style={{ padding: 24 }}>
      <Card title={t('systemConfig.title')}>
        <Tabs defaultActiveKey="communication">
          <Tabs.TabPane tab={t('systemConfig.communicationConfig')} key="communication">
            <div style={{ marginBottom: 16 }}>
              <p style={{ color: '#666', margin: 0 }}>
                {t('systemConfig.description')}
              </p>
            </div>
            
            <Row gutter={24}>
              {/* 邮箱发送配置 */}
              <Col xs={24} lg={12}>
                <Card 
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <MailOutlined style={{ color: '#1890ff' }} />
                      {t('systemConfig.emailConfig.title')}
                    </div>
                  }
                  extra={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Tag color={emailConfigStatus === 'configured' ? 'green' : 'red'}>
                        {emailConfigStatus === 'configured' ? t('systemConfig.emailConfig.statusConfigured') : t('systemConfig.emailConfig.statusNotConfigured')}
                      </Tag>
                      {emailEditing ? (
                        <>
                          <Button onClick={() => {
                            setEmailEditing(false)
                            emailForm.setFieldsValue(originalEmailValues)
                          }}>
                            {t('systemConfig.emailConfig.cancel')}
                          </Button>
                          <Button 
                            type="primary" 
                            icon={<EditOutlined />} 
                            onClick={onSaveEmailConfig}
                          >
                            {t('systemConfig.emailConfig.save')}
                          </Button>
                        </>
                      ) : (
                        <Button 
                          type="primary" 
                          icon={<EditOutlined />} 
                          onClick={() => setEmailEditing(true)}
                        >
                          {t('systemConfig.emailConfig.edit')}
                        </Button>
                      )}
                    </div>
                  }
                  loading={loading}
                >
                  <Form form={emailForm} layout="vertical">
                    <Form.Item 
                      name="EMAIL_ADDRESS" 
                      label={t('systemConfig.emailConfig.emailAddress')}
                      rules={[{ required: true, message: t('systemConfig.validation.emailAddressRequired') }]}
                    >
                      <Input 
                        prefix={<UserOutlined />} 
                        placeholder={t('systemConfig.emailConfig.emailAddressPlaceholder')}
                        disabled={!emailEditing}
                      />
                    </Form.Item>
                    
                    <Form.Item 
                      name="EMAIL_HOST" 
                      label={t('systemConfig.emailConfig.emailHost')}
                      rules={[{ required: true, message: t('systemConfig.validation.emailHostRequired') }]}
                    >
                      <Input 
                        prefix={<DatabaseOutlined />} 
                        placeholder={t('systemConfig.emailConfig.emailHostPlaceholder')}
                        disabled={!emailEditing}
                      />
                    </Form.Item>
                    
                    <Form.Item 
                      name="EMAIL_PORT" 
                      label={t('systemConfig.emailConfig.emailPort')}
                      rules={[{ required: true, message: t('systemConfig.validation.emailPortRequired') }]}
                    >
                      <Input 
                        prefix={<ToolOutlined />} 
                        placeholder={t('systemConfig.emailConfig.emailPortPlaceholder')}
                        disabled={!emailEditing}
                      />
                    </Form.Item>
                    
                    <Form.Item 
                      name="EMAIL_PASSWORD" 
                      label={t('systemConfig.emailConfig.emailPassword')}
                      rules={[{ required: true, message: t('systemConfig.validation.emailPasswordRequired') }]}
                    >
                      <Input.Password 
                        prefix={<LockOutlined />}
                        placeholder={t('systemConfig.emailConfig.emailPasswordPlaceholder')}
                        disabled={!emailEditing}
                        visibilityToggle={{
                          visible: emailPasswordVisible,
                          onVisibleChange: setEmailPasswordVisible
                        }}
                        iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
                      />
                    </Form.Item>
                    
                    <div style={{ fontSize: '12px', color: '#999', marginTop: -8 }}>
                      {t('systemConfig.emailConfig.emailPasswordHint')}
                    </div>
                  </Form>
                </Card>
              </Col>

              {/* WhatsApp 配置 */}
              <Col xs={24} lg={12}>
                <Card 
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <WhatsAppOutlined style={{ color: '#25D366' }} />
                      {t('systemConfig.whatsappConfig.title')}
                    </div>
                  }
                  extra={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Tag color={whatsappConfigStatus === 'configured' ? 'green' : 'red'}>
                        {whatsappConfigStatus === 'configured' ? t('systemConfig.whatsappConfig.statusConfigured') : t('systemConfig.whatsappConfig.statusNotConfigured')}
                      </Tag>
                      {whatsappEditing ? (
                        <>
                          <Button onClick={() => {
                            setWhatsappEditing(false)
                            whatsappForm.setFieldsValue(originalWhatsappValues)
                          }}>
                            {t('systemConfig.whatsappConfig.cancel')}
                          </Button>
                          <Button 
                            type="primary" 
                            icon={<EditOutlined />} 
                            onClick={onSaveWhatsappConfig}
                          >
                            {t('systemConfig.whatsappConfig.save')}
                          </Button>
                        </>
                      ) : (
                        <Button 
                          type="primary" 
                          icon={<EditOutlined />} 
                          onClick={() => setWhatsappEditing(true)}
                        >
                          {t('systemConfig.whatsappConfig.edit')}
                        </Button>
                      )}
                    </div>
                  }
                  loading={loading}
                >
                  <Form form={whatsappForm} layout="vertical">
                    <Form.Item 
                      name="WHATSAPP_SENDER_NUMBER" 
                      label={t('systemConfig.whatsappConfig.senderNumber')}
                      rules={[{ required: true, message: t('systemConfig.validation.senderNumberRequired') }]}
                    >
                      <Input 
                        prefix={<PhoneOutlined />} 
                        placeholder={t('systemConfig.whatsappConfig.senderNumberPlaceholder')}
                        disabled={!whatsappEditing}
                      />
                    </Form.Item>
                    
                    <div style={{ fontSize: '12px', color: '#999', marginTop: -8, marginBottom: 16 }}>
                      {t('systemConfig.whatsappConfig.senderNumberHint')}
                    </div>
                    
                    <Form.Item 
                      name="WHATSAPP_API_TOKEN" 
                      label={t('systemConfig.whatsappConfig.apiToken')}
                      rules={[{ required: true, message: t('systemConfig.validation.apiTokenRequired') }]}
                    >
                      <Input.Password 
                        prefix={<LockOutlined />}
                        placeholder={t('systemConfig.whatsappConfig.apiTokenPlaceholder')}
                        disabled={!whatsappEditing}
                        visibilityToggle={{
                          visible: whatsappTokenVisible,
                          onVisibleChange: setWhatsappTokenVisible
                        }}
                        iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
                      />
                    </Form.Item>
                    
                    <Form.Item 
                      name="WHATSAPP_TEMPLATE_NAME" 
                      label={t('systemConfig.whatsappConfig.templateName')}
                      rules={[{ required: true, message: t('systemConfig.validation.templateNameRequired') }]}
                    >
                      <Input 
                        prefix={<UserOutlined />} 
                        placeholder={t('systemConfig.whatsappConfig.templateNamePlaceholder')}
                        disabled={!whatsappEditing}
                      />
                    </Form.Item>
                    
                    {/* 添加与左边提示文本相同高度的div保持高度一致 */}
                    <div style={{ fontSize: '12px', color: '#999', marginTop: -8, height: '20px' }}>
                      {/* 空白提示文本，用于保持高度一致 */}
                    </div>
                    
                    {/* 添加空白区域保持高度一致 */}
                    <div style={{ height: '60px' }}></div>
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


