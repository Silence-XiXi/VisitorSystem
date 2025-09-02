import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Form, Input, Button, Select, message, Space, Typography } from 'antd'
import { UserOutlined, LockOutlined, TeamOutlined } from '@ant-design/icons'
import { useAuth } from '../hooks/useAuth'

const { Title } = Typography
const { Option } = Select

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  const onFinish = async (values: { username: string; password: string; role: string }) => {
    setLoading(true)
    try {
      const success = await login(values.username, values.password, values.role)
      if (success) {
        message.success('登录成功！')
        navigate('/dashboard')
      } else {
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
              name="role"
              label="角色"
              rules={[{ required: true, message: '请选择您的角色!' }]}
            >
              <Select
                prefix={<TeamOutlined />}
                placeholder="请选择角色"
                style={{ textAlign: 'left' }}
              >
                <Option value="subcontractor">分判商</Option>
                <Option value="admin">管理员</Option>
                <Option value="supervisor">监督员</Option>
              </Select>
            </Form.Item>

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
