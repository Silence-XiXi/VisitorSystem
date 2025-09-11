import React, { useState, useEffect } from 'react'
import { Layout, Button, Avatar, Dropdown, Typography, message } from 'antd'
import { UserOutlined, LogoutOutlined, ClockCircleOutlined, GlobalOutlined } from '@ant-design/icons'
import { useNavigate, Routes, Route, Navigate } from 'react-router-dom'
import dayjs from 'dayjs'
import DistributorWorkerUpload from '../pages/DistributorWorkerUpload'
import DistributorAccountSettings from '../pages/DistributorAccountSettings'
import { useAuth } from '../hooks/useAuth'
import { useLocale } from '../contexts/LocaleContext'
import { apiService } from '../services/api'

const { Header, Content } = Layout
const { Text } = Typography

const DistributorLayout: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(dayjs())
  const [distributorInfo, setDistributorInfo] = useState<any>(null)
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { setLocale, t, locale } = useLocale()

  // 根据语言格式化时间
  const formatTime = (time: dayjs.Dayjs) => {
    if (locale === 'zh-CN') {
      return time.format('YYYY年MM月DD日 HH:mm:ss dddd')
    } else if (locale === 'zh-TW') {
      return time.format('YYYY年MM月DD日 HH:mm:ss dddd')
    } else {
      return time.format('YYYY-MM-DD HH:mm:ss dddd')
    }
  }

  // 检查用户角色，只有分判商才能访问
  useEffect(() => {
    console.log('DistributorLayout - User:', user)
    if (user && user.role?.toLowerCase() !== 'distributor') {
      console.log('User role is not distributor, redirecting to login')
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
    const fetchDistributorInfo = async () => {
      if (user && user.role?.toLowerCase() === 'distributor') {
        try {
          console.log('获取分判商信息...', user)
          const profile = await apiService.getProfile()
          console.log('用户资料:', profile)
          
          if (profile.distributor) {
            setDistributorInfo(profile.distributor)
          } else {
            console.warn('用户资料中没有分判商信息')
            message.error('无法获取分判商信息')
          }
        } catch (error) {
          console.error('获取分判商信息失败:', error)
          message.error('获取分判商信息失败')
        }
      }
    }

    fetchDistributorInfo()
  }, [user])


  // 处理退出登录
  const handleLogout = async () => {
    try {
      await logout()
      message.success(t('login.logoutSuccess'))
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
      message.error(t('login.logoutFailed'))
    }
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
            {formatTime(currentTime)}
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
                {user?.username || distributorInfo.username}（{t('common.subcontractor')}）
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
