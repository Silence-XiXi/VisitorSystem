import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Form, Input, Button, message, Space, Typography } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useAuth } from '../hooks/useAuth'

const { Title } = Typography

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login, isAuthenticated, user, isLoading } = useAuth()

  // 如果用户已经登录，自动跳转到相应页面
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === 'subcontractor') {
        navigate('/distributor/workers')
      } else if (user.role === 'guard') {
        navigate('/guard')
      } else {
        navigate('/dashboard')
      }
    }
  }, [isAuthenticated, user, isLoading, navigate])

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      const result = await login(values.username, values.password)
      console.log('Login result:', result)
      if (result.success) {
        message.success('登录成功！')
        // 添加小延迟确保状态更新
        setTimeout(() => {
          // 根据识别出的角色跳转到不同页面
          if (result.role === 'subcontractor') {
            console.log('Navigating to distributor workers page')
            navigate('/distributor/workers')
          } else if (result.role === 'guard') {
            console.log('Navigating to guard page')
            navigate('/guard')
          } else {
            console.log('Navigating to dashboard')
            navigate('/dashboard')
          }
        }, 100)
      } else {
        console.log('Login failed')
        message.error('登录失败，请检查您的凭据')
      }
    } catch (error) {
      message.error('登录过程中发生错误')
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
              工地访客管理系统
            </Title>
            <p style={{ color: '#666', margin: 0 }}>请登录您的账户</p>
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
              label="用户名"
              rules={[{ required: true, message: '请输入用户名!' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="请输入用户名"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码!' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请输入密码"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{
                  height: 48,
                  fontSize: 16,
                  fontWeight: 500
                }}
              >
                {loading ? '登录中...' : '登录'}
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  )
}

export default Login
