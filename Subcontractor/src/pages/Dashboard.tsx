import React, { useState } from 'react'
import { Layout, Menu, Avatar, Dropdown, Space, Typography, Button } from 'antd'
import {
  UserOutlined,
  TeamOutlined,
  BarChartOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { useLocale } from '../contexts/LocaleContext'
import LocaleSwitcher from '../components/LocaleSwitcher'
import WorkerManagement from './WorkerManagement'
import Admin from './Admin'
import AccountSettings from './AccountSettings'
import DataOverview from '../components/DataOverview'
import Reports from './Reports'

const { Header, Sider, Content } = Layout
const { Title } = Typography

const Dashboard: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const [selectedMenu, setSelectedMenu] = useState('overview')
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { t } = useLocale()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const menuItems = [
    {
      key: 'overview',
      icon: <BarChartOutlined />,
      label: t('navigation.overview')
    },
    {
      key: 'workers',
      icon: <TeamOutlined />,
      label: t('navigation.workerManagement')
    },
    {
      key: 'admin',
      icon: <TeamOutlined />,
      label: '系统管理'
    },
    {
      key: 'account',
      icon: <UserOutlined />,
      label: '账户设置'
    },
    {
      key: 'reports',
      icon: <FileTextOutlined />,
      label: t('navigation.reports')
    }
  ]

  const dropdownItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('navigation.logout'),
      onClick: handleLogout
    }
  ]

  const renderContent = () => {
    switch (selectedMenu) {
      case 'overview':
        return <DataOverview />
      case 'workers':
        return <WorkerManagement />
      case 'reports':
        return <Reports />
      case 'admin':
        return <Admin />
      case 'account':
        return <AccountSettings />
      default:
        return <DataOverview />
    }
  }

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
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)'
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
          selectedKeys={[selectedMenu]}
          items={menuItems}
          style={{ border: 'none' }}
          onClick={({ key }) => setSelectedMenu(key)}
        />
      </Sider>

      <Layout>
        <Header style={{
          padding: '0 24px',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />

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
          margin: '16px',
          padding: '24px',
          background: '#fff',
          borderRadius: '12px',
          minHeight: 'calc(100vh - 96px)',
          overflow: 'auto',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
        }}>
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  )
}

export default Dashboard
