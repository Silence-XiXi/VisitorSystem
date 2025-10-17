import React, { useState, useEffect } from 'react'
import { Layout, Menu, Dropdown, Space, Typography, Button, Select } from 'antd'
import {
  UserOutlined,
  TeamOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  AppstoreOutlined,
  DashboardOutlined,
  HomeOutlined,
  SettingOutlined,
  HistoryOutlined,
  UsergroupAddOutlined
} from '@ant-design/icons'
import { useAuth } from '../hooks/useAuth'
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom'
import { useLocale } from '../contexts/LocaleContext'
import { useSiteFilter } from '../contexts/SiteFilterContext'
import LocaleSwitcher from '../components/LocaleSwitcher'
import WorkerManagement from './WorkerManagement'

import AdminSites from './AdminSites'
import ItemCategoryManagement from './ItemCategoryManagement'
import ItemBorrowRecords from './ItemBorrowRecords'

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
  const { t, locale } = useLocale()
  const { selectedSiteId, setSelectedSiteId, sites, loading } = useSiteFilter()

  // 根据语言格式化时间
  const formatTime = (time: dayjs.Dayjs) => {
    if (locale === 'zh-CN') {
      return {
        date: time.format('YYYY年MM月DD日'),
        weekday: time.format('dddd')
      }
    } else if (locale === 'zh-TW') {
      return {
        date: time.format('YYYY年MM月DD日'),
        weekday: time.format('dddd')
      }
    } else {
      return {
        date: time.format('YYYY-MM-DD'),
        weekday: time.format('dddd')
      }
    }
  }

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
    if (path === '/dashboard/item-borrow-records') return 'item-borrow-records'
    if (path === '/dashboard/account') return 'account'
    return 'reports'
  }

  // 登出功能 - 直接调用 useAuth 的 logout 方法
  const handleLogout = () => {
    logout();
  };

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
      case 'item-borrow-records':
        navigate('/dashboard/item-borrow-records')
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
      icon: <DashboardOutlined style={{ color: '#1890ff', fontSize: '16px' }} />,
      label: t('navigation.overview')
    },
    {
      key: 'admin-sites',
      icon: <HomeOutlined style={{ color: '#52c41a', fontSize: '16px' }} />,
      label: t('admin.siteManagement')
    },
    {
      key: 'item-categories',
      icon: <AppstoreOutlined style={{ color: '#fa8c16', fontSize: '16px' }} />,
      label: t('admin.itemCategoryManagement')
    },
    {
      key: 'item-borrow-records',
      icon: <HistoryOutlined style={{ color: '#722ed1', fontSize: '16px' }} />,
      label: t('admin.itemBorrowRecords')
    },
    {
      key: 'workers',
      icon: <UsergroupAddOutlined style={{ color: '#13c2c2', fontSize: '16px' }} />,
      label: t('navigation.workerManagement')
    }
  ]

  const dropdownItems = [
    {
      key: 'account',
      icon: <SettingOutlined style={{ color: '#1890ff', fontSize: '14px' }} />,
      label: t('navigation.accountSettings'),
      onClick: () => handleMenuClick('account')
    },
    {
      key: 'logout',
      icon: <LogoutOutlined style={{ color: '#ff4d4f', fontSize: '14px' }} />,
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
            {collapsed ? t('navigation.shortTitle') : t('navigation.system')}
          </Title>
        </div>
        
        <Menu
          mode="inline"
          selectedKeys={[getSelectedMenu()]}
          items={menuItems}
          style={{ 
            border: 'none',
            background: 'transparent'
          }}
          onClick={({ key }) => handleMenuClick(key)}
          theme="light"
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
          transition: 'left 0.2s',
          flexWrap: 'nowrap',
          overflow: 'hidden'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px',
            flex: 1,
            minWidth: 0,
            overflow: 'hidden'
          }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: '16px', width: 64, height: 64, flexShrink: 0 }}
            />
            
            {/* 当前时间显示 - 在小屏幕上隐藏 */}
            <div className="header-time-display">
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
                  {formatTime(currentTime).date} {formatTime(currentTime).weekday}
                </div>
              </div>
            </div>

            {/* 当前页面标题 - 响应式显示 */}
            <div className="header-page-title">
              <span style={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '300px'
              }}>
                {location.pathname === '/worker-management' && '北京建筑公司 - 工人信息管理'}
                {location.pathname === '/admin/sites' && '工地管理'}
                {location.pathname === '/item-borrow-records' && '物品借用记录管理'}
                {location.pathname === '/reports' && '访客记录统计'}
                {location.pathname === '/account-settings' && '账户设置'}
              </span>
            </div>

            {/* 工地筛选框 - 响应式显示 */}
            <div className="header-site-filter">
              <span style={{ 
                color: '#666', 
                fontSize: '14px',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}>{t('admin.siteFilter')}：</span>
              <Select
                value={selectedSiteId}
                onChange={setSelectedSiteId}
                style={{ 
                  width: '180px',
                  minWidth: '120px',
                  flexShrink: 1
                }}
                placeholder={t('admin.selectSite')}
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                loading={loading}
                options={sites.map(site => ({
                  value: site.id,
                  label: site.name
                }))}
              />
            </div>
          </div>

          <Space size="middle" className="header-user-info">
            <LocaleSwitcher />
            <Dropdown menu={{ items: dropdownItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <span style={{ 
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100px'
                }}>{user?.username}</span>
                <span style={{ 
                  color: '#666',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '80px'
                }}>
                  ({user?.role === 'admin' ? t('common.roleAdmin') : user?.role === 'subcontractor' ? t('common.subcontractor') : user?.role ? t(`common.${user.role}`) : t('common.unknownRole')})
                </span>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{
          margin: '80px 8px 8px 8px',
          padding: '12px',
          background: '#fff',
          borderRadius: '8px',
          minHeight: 'calc(100vh - 96px)',
          overflow: 'visible',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
          width: 'calc(100vw - 16px)',
          maxWidth: collapsed ? 'calc(100vw - 96px)' : 'calc(100vw - 216px)',
          transition: 'max-width 0.2s'
        }}>
          <Routes>
            <Route path="/" element={<Reports />} />
            <Route path="/reports" element={<Reports />} />

            <Route path="/workers" element={<WorkerManagement />} />
            <Route path="/admin-sites" element={<AdminSites />} />
            <Route path="/item-categories" element={<ItemCategoryManagement />} />
            <Route path="/item-borrow-records" element={<ItemBorrowRecords />} />
            <Route path="/account" element={<AccountSettings />} />
            <Route path="*" element={<Navigate to="/reports" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}

export default Dashboard

// 添加自定义样式来美化菜单
const menuStyles = `
  .ant-menu-item {
    margin: 4px 8px !important;
    border-radius: 8px !important;
    transition: all 0.3s ease !important;
  }
  
  .ant-menu-item:hover {
    background-color: #f0f8ff !important;
    transform: translateX(2px) !important;
  }
  
  .ant-menu-item-selected {
    background-color: #e6f7ff !important;
    border-right: 3px solid #1890ff !important;
  }
  
  .ant-menu-item-selected:hover {
    background-color: #bae7ff !important;
  }
  
  .ant-menu-item .anticon {
    transition: all 0.3s ease !important;
  }
  
  .ant-menu-item:hover .anticon {
    transform: scale(1.1) !important;
  }
  
  .ant-menu-item-selected .anticon {
    transform: scale(1.05) !important;
  }
`

// 动态添加样式
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style')
  styleElement.textContent = menuStyles
  document.head.appendChild(styleElement)
}
