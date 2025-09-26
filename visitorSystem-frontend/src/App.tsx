import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
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

function App() {
  const { isAuthenticated, user, isLoading } = useAuth()
  
  console.log('App - isAuthenticated:', isAuthenticated, 'user:', user, 'isLoading:', isLoading)
  
  // 添加更详细的调试信息
  useEffect(() => {
    console.log('App - Authentication state changed:', {
      isAuthenticated,
      user: user ? { id: user.id, username: user.username, role: user.role } : null,
      isLoading
    })
  }, [isAuthenticated, user, isLoading])

  // 在认证状态初始化完成前显示加载状态
  if (isLoading) {
    return <LoadingSpinner />
  }

  // 移除App.tsx中的重定向逻辑，由Login.tsx处理

  return (
    <LocaleProvider>
      <SiteFilterProvider>
        <div className="App">
          <Routes>
            <Route 
              path="/login" 
              element={<Login />} 
            />
            <Route 
              path="/dashboard/*" 
              element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />} 
            />
            <Route 
              path="/workers" 
              element={isAuthenticated ? <WorkerManagement /> : <Navigate to="/login" replace />} 
            />
            {/* 分判商路由 */}
            <Route 
              path="/distributor/*" 
              element={isAuthenticated ? <DistributorLayout /> : <Navigate to="/login" replace />} 
            />
            {/* 门卫路由 */}
            <Route 
              path="/guard" 
              element={isAuthenticated && user?.role?.toLowerCase() === 'guard' ? <Guard /> : <Navigate to="/login" replace />} 
            />
            {/* 工人自助注册路由 - 无需登录即可访问 */}
            <Route path="/worker-registration" element={<WorkerSelfRegistration />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </SiteFilterProvider>
    </LocaleProvider>
  )
}

export default App
