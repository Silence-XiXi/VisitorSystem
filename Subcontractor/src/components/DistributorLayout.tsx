import React, { useState, useEffect } from 'react'
import { Layout, Button, Avatar, Dropdown, Typography, message } from 'antd'
import { UserOutlined, LogoutOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { useNavigate, Routes, Route, Navigate } from 'react-router-dom'
import dayjs from 'dayjs'
import DistributorWorkerUpload from '../pages/DistributorWorkerUpload'
import { useAuth } from '../hooks/useAuth'

const { Header, Content } = Layout
const { Text } = Typography

const DistributorLayout: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(dayjs())
  const [distributorInfo, setDistributorInfo] = useState<any>(null)
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  // 检查用户角色，只有分判商才能访问
  useEffect(() => {
    console.log('DistributorLayout - User:', user)
    if (user && user.role !== 'subcontractor') {
      console.log('User role is not subcontractor, redirecting to login')
      navigate('/login', { replace: true })
    }
  }, [user, navigate])

  // 更新时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // 获取分判商信息
  useEffect(() => {
    // 根据用户名获取分判商信息
    if (user && user.role === 'subcontractor') {
      const distributorMap: { [key: string]: any } = {
        'bjadmin': { id: '1', name: '北京建筑公司', username: 'bjadmin' },
        'shadmin': { id: '2', name: '上海建设集团', username: 'shadmin' },
        'gzadmin': { id: '3', name: '广州工程公司', username: 'gzadmin' },
        'szadmin': { id: '4', name: '深圳建筑集团', username: 'szadmin' },
        'cdadmin': { id: '5', name: '成都建设公司', username: 'cdadmin' }
      }
      
      const distributorInfo = distributorMap[user.username]
      if (distributorInfo) {
        setDistributorInfo(distributorInfo)
      }
    }
  }, [user])


  // 处理退出登录
  const handleLogout = () => {
    logout()
    message.success('已退出登录')
    navigate('/login')
  }

  // 用户下拉菜单
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
      onClick: () => {
        message.info('个人信息功能开发中...')
      }
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout
    }
  ]


  if (!user || !distributorInfo) {
    return null
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          position: 'fixed',
          zIndex: 1,
          width: '100%',
          background: '#fff',
          padding: '0 24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            color: '#1890ff',
            fontSize: '16px',
            fontWeight: 500
          }}>
            <ClockCircleOutlined style={{ marginRight: 8 }} />
            {currentTime.format('YYYY年MM月DD日 HH:mm:ss dddd')}
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Text style={{ marginRight: 16, color: '#666' }}>
            欢迎，{distributorInfo.name}
          </Text>
          <Dropdown
            menu={{ items: userMenuItems }}
            placement="bottomRight"
            arrow
          >
            <Button type="text" style={{ display: 'flex', alignItems: 'center' }}>
              <Avatar size="small" icon={<UserOutlined />} />
            </Button>
          </Dropdown>
        </div>
      </Header>

      <Layout style={{ marginTop: 64 }}>
        <Layout style={{ background: '#f5f5f5' }}>
          <Content
            style={{
              margin: '24px',
              padding: '24px',
              background: '#fff',
              borderRadius: '8px',
              minHeight: 'calc(100vh - 112px)'
            }}
          >
            <Routes>
              <Route path="/workers" element={<DistributorWorkerUpload />} />
              <Route path="/" element={<Navigate to="/workers" replace />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  )
}

export default DistributorLayout
