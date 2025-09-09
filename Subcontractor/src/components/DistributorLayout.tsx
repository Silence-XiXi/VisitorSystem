import React, { useState, useEffect } from 'react'
import { Layout, Button, Avatar, Dropdown, Typography, message } from 'antd'
import { UserOutlined, LogoutOutlined, ClockCircleOutlined, GlobalOutlined } from '@ant-design/icons'
import { useNavigate, Routes, Route, Navigate } from 'react-router-dom'
import dayjs from 'dayjs'
import DistributorWorkerUpload from '../pages/DistributorWorkerUpload'
import DistributorAccountSettings from '../pages/DistributorAccountSettings'
import { useAuth } from '../hooks/useAuth'
import { useLocale } from '../contexts/LocaleContext'

const { Header, Content } = Layout
const { Text } = Typography

const DistributorLayout: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(dayjs())
  const [distributorInfo, setDistributorInfo] = useState<any>(null)
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { setLocale, t } = useLocale()

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
    message.success(t('login.logoutSuccess'))
    navigate('/login')
  }

  // 语言切换处理函数
  const handleLanguageChange = (newLocale: string) => {
    setLocale(newLocale as 'zh-CN' | 'zh-TW' | 'en-US')
    message.success(t('login.languageChanged'))
  }

  // 用户下拉菜单
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: t('navigation.profile'),
      onClick: () => {
        navigate('/distributor/profile')
      }
    },
    {
      key: 'language',
      label: t('navigation.languageSwitch'),
      icon: <GlobalOutlined />,
      children: [
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
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('navigation.logout'),
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
          zIndex: 1000,
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
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Text style={{ color: '#666', fontSize: '14px' }}>
            hi, {distributorInfo.name}
          </Text>
          <Dropdown
            menu={{ items: userMenuItems }}
            placement="bottomRight"
            arrow
          >
            <Button 
              type="text" 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                padding: '4px 8px',
                height: 'auto'
              }}
            >
              <Avatar size="small" icon={<UserOutlined />} />
              <Text style={{ color: '#666', fontSize: '14px' }}>
                {user?.username || distributorInfo.username}（分判商）
              </Text>
            </Button>
          </Dropdown>
        </div>
      </Header>

      <Layout style={{ marginTop: 64 }}>
        <Layout style={{ background: '#fff' }}>
          <Content
            style={{
              margin: 0,
              padding: 0,
              background: '#fff',
              minHeight: 'calc(100vh - 64px)'
            }}
          >
            <Routes>
              <Route path="/workers" element={<DistributorWorkerUpload />} />
              <Route path="/profile" element={<DistributorAccountSettings />} />
              <Route path="/settings" element={<DistributorAccountSettings />} />
              <Route path="/" element={<Navigate to="/workers" replace />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  )
}

export default DistributorLayout
