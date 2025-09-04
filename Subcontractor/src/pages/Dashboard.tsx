import React, { useState, useEffect } from 'react'
import { Layout, Menu, Avatar, Dropdown, Space, Typography, Button } from 'antd'
import {
  UserOutlined,
  TeamOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  AppstoreOutlined
} from '@ant-design/icons'
import { useAuth } from '../hooks/useAuth'
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom'
import { useLocale } from '../contexts/LocaleContext'
import LocaleSwitcher from '../components/LocaleSwitcher'
import WorkerManagement from './WorkerManagement'

import AdminSites from './AdminSites'
import ItemCategoryManagement from './ItemCategoryManagement'

import AccountSettings from './AccountSettings'

import Reports from './Reports'
import dayjs from 'dayjs'

const { Header, Sider, Content } = Layout
const { Title } = Typography

const Dashboard: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const [currentTime, setCurrentTime] = useState(dayjs())
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useLocale()

  // 实时更新时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // 根据当前路径确定选中的菜单项
  const getSelectedMenu = () => {
    const path = location.pathname
    if (path === '/dashboard' || path === '/dashboard/reports') return 'reports'

    if (path === '/dashboard/workers') return 'workers'
    if (path === '/dashboard/admin-sites') return 'admin-sites'
    if (path === '/dashboard/item-categories') return 'item-categories'
    if (path === '/dashboard/account') return 'account'
    return 'reports'
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleMenuClick = (key: string) => {
    switch (key) {
      case 'reports':
        navigate('/dashboard/reports')
        break

      case 'workers':
        navigate('/dashboard/workers')
        break
      case 'admin-sites':
        navigate('/dashboard/admin-sites')
        break
      case 'item-categories':
        navigate('/dashboard/item-categories')
        break
      case 'account':
        navigate('/dashboard/account')
        break
      default:
        navigate('/dashboard/reports')
    }
  }

  const menuItems = [
    {
      key: 'reports',
      icon: <FileTextOutlined />,
      label: '首页'
    },
    {
      key: 'admin-sites',
      icon: <FileTextOutlined />,
      label: '工地与分判商管理'
    },
    {
      key: 'item-categories',
      icon: <AppstoreOutlined />,
      label: '借用物品分类管理'
    },
    {
      key: 'workers',
      icon: <TeamOutlined />,
      label: t('navigation.workerManagement')
    }
  ]

  const dropdownItems = [
    {
      key: 'account',
      icon: <UserOutlined />,
      label: '账户设置',
      onClick: () => handleMenuClick('account')
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('navigation.logout'),
      onClick: handleLogout
    }
  ]



  return (
    <Layout style={{ 
      minHeight: '100vh', 
      width: '100vw', 
      overflow: 'hidden' 
    }} className="fade-in">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        style={{
          background: '#fff',
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 1000,
          height: '100vh'
        }}
      >
        <div style={{
          padding: '16px',
          textAlign: 'center',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
            {collapsed ? '分判' : t('navigation.system')}
          </Title>
        </div>
        
        <Menu
          mode="inline"
          selectedKeys={[getSelectedMenu()]}
          items={menuItems}
          style={{ border: 'none' }}
          onClick={({ key }) => handleMenuClick(key)}
        />
      </Sider>

      <Layout style={{
        marginLeft: collapsed ? 80 : 200,
        transition: 'margin-left 0.2s'
      }}>
        <Header style={{
          padding: '0 24px',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          position: 'fixed',
          top: 0,
          left: collapsed ? 80 : 200,
          right: 0,
          zIndex: 999,
          height: '64px',
          transition: 'left 0.2s'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: '16px', width: 64, height: 64 }}
            />
            
            {/* 当前时间显示 */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              padding: '8px 16px',
              color: '#666',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              <ClockCircleOutlined style={{ fontSize: '16px', color: '#1890ff' }} />
              <div>
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: '600',
                  lineHeight: '1.2',
                  color: '#1890ff'
                }}>
                  {currentTime.format('HH:mm:ss')}
                </div>
                <div style={{ 
                  fontSize: '12px',
                  color: '#8c8c8c',
                  lineHeight: '1.2'
                }}>
                  {currentTime.format('YYYY年MM月DD日')} {currentTime.format('dddd')}
                </div>
              </div>
            </div>
          </div>

          <Space size="middle">
            <LocaleSwitcher />
            <Dropdown menu={{ items: dropdownItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} />
                <span>{user?.username}</span>
                <span style={{ color: '#666' }}>({user?.role})</span>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{
          margin: '80px 16px 16px 16px',
          padding: '24px',
          background: '#fff',
          borderRadius: '12px',
          minHeight: 'calc(100vh - 96px)',
          overflow: 'auto',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
        }}>
          <Routes>
            <Route path="/" element={<Reports />} />
            <Route path="/reports" element={<Reports />} />

            <Route path="/workers" element={<WorkerManagement />} />
            <Route path="/admin-sites" element={<AdminSites />} />
            <Route path="/item-categories" element={<ItemCategoryManagement />} />
            <Route path="/account" element={<AccountSettings />} />
            <Route path="*" element={<Navigate to="/reports" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}

export default Dashboard
