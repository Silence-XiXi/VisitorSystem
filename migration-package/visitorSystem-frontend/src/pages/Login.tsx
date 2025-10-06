import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { Card, Form, Input, Button, message, Space, Typography, Row, Col, Dropdown } from 'antd'
import { UserOutlined, LockOutlined, ReloadOutlined, GlobalOutlined } from '@ant-design/icons'
import { useAuth } from '../hooks/useAuth'
import { useLocale } from '../contexts/LocaleContext'

const { Title } = Typography

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [captchaCode, setCaptchaCode] = useState('')
  const [captchaImage, setCaptchaImage] = useState('')
  const [isOnline] = useState(navigator.onLine)
  const hasRedirected = useRef(false)
  const location = useLocation()
  const { login, isAuthenticated, user, isLoading: authLoading } = useAuth()
  const { t, setLocale } = useLocale()

  // 生成验证码
  const generateCaptcha = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setCaptchaCode(result)
    
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = 100
    canvas.height = 36
    
    if (ctx) {
      ctx.fillStyle = '#f0f0f0'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // 干扰线
      for (let i = 0; i < 5; i++) {
        ctx.strokeStyle = `hsl(${Math.random() * 360}, 50%, 70%)`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height)
        ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height)
        ctx.stroke()
      }
      
      // 绘制文字
      ctx.font = 'bold 20px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (let i = 0; i < result.length; i++) {
        const x = 15 + i * 23
        const y = 18 + (Math.random() - 0.5) * 6
        const angle = (Math.random() - 0.5) * 0.3
        
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(angle)
        ctx.fillStyle = `hsl(${Math.random() * 360}, 70%, 40%)`
        ctx.fillText(result[i], 0, 0)
        ctx.restore()
      }
    }
    
    setCaptchaImage(canvas.toDataURL())
  }

  // 初始化验证码
  useEffect(() => {
    generateCaptcha()
  }, [])

  // 语言切换
  const handleLanguageChange = (newLocale: string) => {
    setLocale(newLocale as 'zh-CN' | 'zh-TW' | 'en-US')
    message.success(t('login.languageChanged'))
  }

  // 稳定用户角色计算
  const userRole = useMemo(() => {
    return user?.role?.toLowerCase() || null
  }, [user?.role])

  // 核心跳转逻辑
  const handleRedirect = (role: string) => {
    const targetPath = 
      role === 'distributor' ? '/distributor/workers' :
      role === 'guard' ? '/guard' : '/dashboard';

    // 直接使用原生跳转避免React Router可能的问题
    window.location.replace(targetPath);
  }

  // 跳转逻辑 useEffect
  useEffect(() => {
    if (hasRedirected.current) return

    if (!authLoading && isAuthenticated && userRole && !hasRedirected.current) {
      console.log('Login success detected, redirecting to:', userRole)
      hasRedirected.current = true
      handleRedirect(userRole)
    }
  }, [authLoading, isAuthenticated, userRole])

  // 监听路由变化
  useEffect(() => {
    if (location.pathname !== '/login') {
      hasRedirected.current = true
    }
  }, [location.pathname])

  // 登录提交处理
  const onFinish = async (values: { username: string; password: string; captcha: string }) => {
    if (!isOnline) {
      message.error(t('login.networkDisconnected'))
      return
    }

    if (values.captcha.toUpperCase() !== captchaCode.toUpperCase()) {
      message.error(t('login.captchaError'))
      generateCaptcha()
      return
    }

    setLoading(true)
    try {
      const result = await login(values.username, values.password)
      if (!result.success) {
        message.error(result.error || t('login.loginFailed'))
        generateCaptcha()
      }
    } catch (error) {
      console.error('Login error:', error)
      message.error(t('login.loginError'))
      generateCaptcha()
    } finally {
      setLoading(false)
    }
  }

  // 关键：登录成功后直接不渲染登录页，解决闪屏
  if (isAuthenticated && !authLoading) {
    return null; // 已认证则不渲染任何内容
  }

  // 渲染登录表单（仅当未认证时）
  return (
    <div className="fade-in" style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 50%, #eb2f96 100%)',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 语言切换按钮 */}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000 }}>
        <Dropdown
          menu={{
            items: [
              { key: 'zh-TW', label: t('languages.zhTW'), onClick: () => handleLanguageChange('zh-TW') },
              { key: 'zh-CN', label: t('languages.zhCN'), onClick: () => handleLanguageChange('zh-CN') },
              { key: 'en-US', label: t('languages.enUS'), onClick: () => handleLanguageChange('en-US') }
            ]
          }}
          placement="bottomRight"
          arrow
        >
          <Button type="text" style={{ 
            color: '#fff',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '8px',
            padding: '8px 12px',
            height: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <GlobalOutlined style={{ fontSize: '16px' }} />
            <span>{t('navigation.languageSwitch')}</span>
          </Button>
        </Dropdown>
      </div>
      
      {/* 背景装饰 */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        left: '-50%',
        width: '200%',
        height: '200%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '50px 50px',
        animation: 'float 20s ease-in-out infinite',
        pointerEvents: 'none'
      }} />
      
      <style>{`@keyframes float {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-20px) rotate(180deg); }
      }`}</style>
      
      {/* 登录卡片 */}
      <Card
        style={{
          width: '100%',
          maxWidth: 450,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
          borderRadius: '16px',
          background: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          zIndex: 1
        }}
        bordered={false}
      >
        <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
          <div>
            <Title level={2} style={{ color: '#1890ff', marginBottom: 8 }}>
              {t('login.title')}
            </Title>
            <p style={{ color: '#666', margin: 0 }}>{t('login.subtitle')}</p>
          </div>

          <Form
            name="login"
            onFinish={onFinish}
            layout="vertical"
            requiredMark={false}
            size="large"
          >
            <Form.Item
              name="username"
              label={t('login.username')}
              rules={[
                { required: true, message: t('login.usernameRequired') },
                { min: 2, message: t('login.usernameMinLength') }
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder={t('login.usernamePlaceholder')}
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={t('login.password')}
              rules={[
                { required: true, message: t('login.passwordRequired') },
                { min: 6, message: t('login.passwordMinLength') }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t('login.passwordPlaceholder')}
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item
              name="captcha"
              label={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{t('login.captcha')}</span>
                  <Button
                    type="text"
                    icon={<ReloadOutlined />}
                    size="small"
                    onClick={generateCaptcha}
                  />
                </div>
              }
              rules={[{ required: true, message: t('login.captchaPlaceholder') + '!' }]}
            >
              <Row gutter={8}>
                <Col xs={14} sm={16}>
                  <Input placeholder={t('login.captchaPlaceholder')} style={{ height: 40 }} />
                </Col>
                <Col xs={10} sm={8}>
                  <div 
                    style={{ 
                      height: 40, 
                      width: '100%',
                      border: '1px solid #d9d9d9',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      overflow: 'hidden'
                    }}
                    onClick={generateCaptcha}
                  >
                    {captchaImage && (
                      <img 
                        src={captchaImage} 
                        alt="验证码" 
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                      />
                    )}
                  </div>
                </Col>
              </Row>
            </Form.Item>

            {!isOnline && (
              <div style={{
                padding: '8px 12px',
                backgroundColor: '#fff2e8',
                border: '1px solid #ffd591',
                borderRadius: '6px',
                color: '#d46b08',
                fontSize: '14px',
                textAlign: 'center',
                marginBottom: '16px'
              }}>
                ⚠️ {t('login.networkDisconnected')}
              </div>
            )}

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                disabled={!isOnline}
                block
                style={{ height: 48, fontSize: 16 }}
              >
                {loading ? t('login.loggingIn') : t('login.loginButton')}
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  )
}

export default Login