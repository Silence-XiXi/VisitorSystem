import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { LocaleProvider } from './contexts/LocaleContext'
import { SiteFilterProvider } from './contexts/SiteFilterContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import WorkerManagement from './pages/WorkerManagement'
import DistributorLayout from './components/DistributorLayout'
import Guard from './pages/Guard'
import LoadingSpinner from './components/LoadingSpinner'
import { useAuth } from './hooks/useAuth'
import WorkerSelfRegistration from './pages/WorkerSelfRegistration'

// 定义 PrivateRoute 组件的 props 类型
interface PrivateRouteProps {
  element: React.ReactNode
  requiredRole?: string
}

function App() {
  const { isAuthenticated, user, isLoading } = useAuth()
  
  // 计算用户首页路径（独立函数，避免重复逻辑）
  const getUserHomePath = () => {
    const role = user?.role?.toLowerCase()
    if (role === 'distributor') return '/distributor/workers'
    if (role === 'guard') return '/guard'
    return '/dashboard'
  }

  // 增强的路由守卫组件
  const PrivateRoute: React.FC<PrivateRouteProps> = ({ element, requiredRole }) => {
    if (isLoading) {
      return <LoadingSpinner />; // 显示加载状态
    }
    
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    
    if (requiredRole && user?.role?.toLowerCase() !== requiredRole) {
      return (
        <div style={{ 
          padding: '40px 20px', 
          textAlign: 'center',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f5f5f5'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            maxWidth: '400px'
          }}>
            <h2 style={{ color: '#ff4d4f', marginBottom: '16px' }}>访问被拒绝</h2>
            <p style={{ color: '#666', marginBottom: '24px' }}>
              您没有访问此页面的权限。当前角色：{user?.role || '未知'}
            </p>
            <p style={{ color: '#999', fontSize: '14px' }}>
              如需访问，请联系系统管理员
            </p>
          </div>
        </div>
      );
    }
    
    return element;
  };

  return (
    <LocaleProvider>
      <SiteFilterProvider>
        <div className="App">
          <Routes>
            {/* 登录页路由：已登录则直接跳转到首页 */}
            <Route 
              path="/login" 
              element={
                isLoading ? (
                  <LoadingSpinner />
                ) : isAuthenticated ? (
                  <Navigate to={getUserHomePath()} replace />
                ) : (
                  <Login />
                )
              } 
            />
            
            {/* 其他路由保持不变 */}
            <Route path="/dashboard/*" element={<PrivateRoute element={<Dashboard />} />} />
            <Route path="/workers" element={<PrivateRoute element={<WorkerManagement />} />} />
            <Route 
              path="/distributor/*" 
              element={<PrivateRoute element={<DistributorLayout />} requiredRole="distributor" />} 
            />
            <Route path="/guard" element={<PrivateRoute element={<Guard />} requiredRole="guard" />} />
            <Route path="/worker-registration" element={<WorkerSelfRegistration />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </SiteFilterProvider>
    </LocaleProvider>
  )
}

export default App