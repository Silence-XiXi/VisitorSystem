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

function App() {
  const { isAuthenticated, user, isLoading } = useAuth()
  
  console.log('App - isAuthenticated:', isAuthenticated, 'user:', user, 'isLoading:', isLoading)

  // 在认证状态初始化完成前显示加载状态
  if (isLoading) {
    return <LoadingSpinner />
  }

  // 如果用户已登录，根据角色重定向到默认页面
  if (isAuthenticated && user) {
    const currentPath = window.location.pathname
    console.log('Current path:', currentPath, 'User role:', user.role)
    
    // 如果用户在登录页面，重定向到对应角色页面
    if (currentPath === '/login') {
      if (user.role === 'subcontractor') {
        window.location.replace('/distributor/workers')
        return null
      } else if (user.role === 'guard') {
        window.location.replace('/guard')
        return null
      } else {
        window.location.replace('/dashboard')
        return null
      }
    }
  }

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
              element={isAuthenticated && user?.role === 'guard' ? <Guard /> : <Navigate to="/login" replace />} 
            />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </SiteFilterProvider>
    </LocaleProvider>
  )
}

export default App
