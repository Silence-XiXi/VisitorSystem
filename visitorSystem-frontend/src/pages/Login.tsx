import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Form, Input, Button, message, Space, Typography, Row, Col, Dropdown } from 'antd'
import { UserOutlined, LockOutlined, ReloadOutlined, GlobalOutlined } from '@ant-design/icons'
import { useAuth } from '../hooks/useAuth'
import { useLocale } from '../contexts/LocaleContext'

const { Title } = Typography

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [captchaCode, setCaptchaCode] = useState('')
  const [captchaImage, setCaptchaImage] = useState('')
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [retryCount, setRetryCount] = useState(0)
  const navigate = useNavigate()
  const { login, isAuthenticated, user, isLoading } = useAuth()
  const { t, setLocale } = useLocale()

  // 监听网络状态
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // 生成验证码
  const generateCaptcha = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setCaptchaCode(result)
    
    // 创建验证码图片
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = 120
    canvas.height = 40
    
    if (ctx) {
      // 背景
      ctx.fillStyle = '#f0f0f0'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // 添加干扰线
      for (let i = 0; i < 5; i++) {
        ctx.strokeStyle = `hsl(${Math.random() * 360}, 50%, 70%)`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height)
        ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height)
        ctx.stroke()
      }
      
      // 添加干扰点
      for (let i = 0; i < 50; i++) {
        ctx.fillStyle = `hsl(${Math.random() * 360}, 50%, 60%)`
        ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1, 1)
      }
      
      // 绘制验证码文字
      ctx.font = 'bold 20px Arial'
      ctx.fillStyle = '#333'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      for (let i = 0; i < result.length; i++) {
        const x = 20 + i * 25
        const y = 20 + (Math.random() - 0.5) * 10
        const angle = (Math.random() - 0.5) * 0.4
        
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

  // 语言切换处理函数
  const handleLanguageChange = (newLocale: string) => {
    setLocale(newLocale as 'zh-CN' | 'zh-TW' | 'en-US')
    message.success(t('login.languageChanged'))
  }

  // 如果用户已经登录，自动跳转到相应页面（仅在页面加载时检查）
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      console.log('Auto redirecting user on page load:', user)
      const userRole = user.role.toLowerCase()
      if (userRole === 'distributor') {
        navigate('/distributor/workers', { replace: true })
      } else if (userRole === 'guard') {
        navigate('/guard', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    }
  }, [isLoading]) // 只在isLoading变化时触发，避免重复跳转

  const onFinish = async (values: { username: string; password: string; captcha: string }) => {
    // 检查网络状态
    if (!isOnline) {
      message.error(t('login.networkDisconnected'))
      return
    }

    // 验证验证码
    if (values.captcha.toUpperCase() !== captchaCode.toUpperCase()) {
      message.error(t('login.captchaError'))
      generateCaptcha() // 重新生成验证码
      return
    }

    setLoading(true)
    setRetryCount(0) // 重置重试计数
    
    try {
      const result = await login(values.username, values.password)
      console.log('Login result:', result)
      
      if (result.success) {
        message.success(t('login.loginSuccess'))
        setRetryCount(0) // 登录成功，重置重试计数
        
        // 登录成功后，等待状态稳定再跳转
        setTimeout(() => {
          const userRole = result.role?.toLowerCase()
          if (userRole === 'distributor') {
            navigate('/distributor/workers', { replace: true })
          } else if (userRole === 'guard') {
            navigate('/guard', { replace: true })
          } else {
            navigate('/dashboard', { replace: true })
          }
        }, 200) // 200ms延迟确保状态稳定
      } else {
        console.log('Login failed:', result)
        
        // 根据错误代码显示不同的错误信息
        let errorMessage = result.error || t('login.loginFailed')
        
        if (result.errorCode === 401) {
          errorMessage = t('login.usernamePasswordError')
          setRetryCount(0) // 认证错误，不重试
        } else if (result.errorCode === 0) {
          errorMessage = t('login.networkConnectionFailed')
          setRetryCount(prev => prev + 1) // 网络错误，增加重试计数
        } else if (result.errorCode === 500) {
          errorMessage = t('login.serverError')
          setRetryCount(prev => prev + 1) // 服务器错误，增加重试计数
        } else if (result.errorCode === 400) {
          errorMessage = result.error || t('login.inputError')
          setRetryCount(0) // 输入错误，不重试
        }
        
        message.error(errorMessage)
        generateCaptcha() // 登录失败时重新生成验证码
      }
    } catch (error) {
      console.error('Login error:', error)
      setRetryCount(prev => prev + 1) // 异常错误，增加重试计数
      message.error(t('login.loginError'))
      generateCaptcha() // 发生错误时重新生成验证码
    } finally {
      setLoading(false)
    }
  }

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
      {/* 语言切换按钮 - 整个页面右上角 */}
      <div style={{ 
        position: 'fixed', 
        top: '20px', 
        right: '20px',
        zIndex: 1000
      }}>
        <Dropdown
          menu={{
            items: [
              {
                key: 'zh-CN',
                label: t('languages.zhCN'),
                onClick: () => handleLanguageChange('zh-CN')
              },
              {
                key: 'zh-TW',
                label: t('languages.zhTW'),
                onClick: () => handleLanguageChange('zh-TW')
              },
              {
                key: 'en-US',
                label: t('languages.enUS'),
                onClick: () => handleLanguageChange('en-US')
              }
            ]
          }}
          placement="bottomRight"
          arrow
        >
          <Button 
            type="text" 
            style={{ 
              color: '#fff',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              padding: '8px 12px',
              height: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
            }}
          >
            <GlobalOutlined style={{ fontSize: '16px' }} />
            <span style={{ fontSize: '14px', fontWeight: 500 }}>{t('navigation.languageSwitch')}</span>
          </Button>
        </Dropdown>
      </div>
      {/* 背景装饰元素 */}
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
      
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
      `}</style>
      <Card
        style={{
          width: '100%',
          maxWidth: 450,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
          borderRadius: '16px',
          backdropFilter: 'blur(10px)',
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
                { min: 2, message: t('login.usernameMinLength') },
                { max: 50, message: t('login.usernameMaxLength') },
                { 
                  pattern: /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, 
                  message: t('login.usernameFormat')
                }
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder={t('login.usernamePlaceholder')}
                maxLength={50}
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={t('login.password')}
              rules={[
                { required: true, message: t('login.passwordRequired') },
                { min: 6, message: t('login.passwordMinLength') },
                { max: 100, message: t('login.passwordMaxLength') }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t('login.passwordPlaceholder')}
                maxLength={100}
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item
              name="captcha"
              label={t('login.captcha')}
              rules={[{ required: true, message: t('login.captchaPlaceholder') + '!' }]}
            >
              <Row gutter={8}>
                <Col span={16}>
                  <Input
                    placeholder={t('login.captchaPlaceholder')}
                    style={{ height: 40 }}
                  />
                </Col>
                <Col span={8}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px'
                  }}>
                    <div style={{ 
                      height: 40, 
                      flex: 1,
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      border: '1px solid #d9d9d9',
                      borderRadius: '6px',
                      background: '#fff',
                      cursor: 'pointer'
                    }}
                    onClick={generateCaptcha}
                    >
                      {captchaImage && (
                        <img 
                          src={captchaImage} 
                          alt="验证码" 
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'cover',
                            borderRadius: '6px'
                          }} 
                        />
                      )}
                    </div>
                    <Button
                      type="text"
                      icon={<ReloadOutlined />}
                      size="small"
                      style={{
                        padding: '4px 6px',
                        minWidth: 'auto',
                        height: '32px',
                        background: '#f5f5f5',
                        border: '1px solid #d9d9d9',
                        borderRadius: '6px'
                      }}
                      onClick={generateCaptcha}
                    />
                  </div>
                </Col>
              </Row>
            </Form.Item>

            {/* 网络状态指示器 */}
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

            {/* 重试计数提示 */}
            {retryCount > 0 && (
              <div style={{
                padding: '8px 12px',
                backgroundColor: '#f6ffed',
                border: '1px solid #b7eb8f',
                borderRadius: '6px',
                color: '#52c41a',
                fontSize: '14px',
                textAlign: 'center',
                marginBottom: '16px'
              }}>
                ℹ️ {t('login.retryCount').replace('{count}', retryCount.toString())}
              </div>
            )}

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                disabled={!isOnline}
                block
                style={{
                  height: 48,
                  fontSize: 16,
                  fontWeight: 500
                }}
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
