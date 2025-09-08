import { Routes, Route, Navigate } from 'react-router-dom'
import { LocaleProvider } from './contexts/LocaleContext'
import { SiteFilterProvider } from './contexts/SiteFilterContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import WorkerManagement from './pages/WorkerManagement'
import DistributorLayout from './components/DistributorLayout'
import Guard from './pages/Guard'
import { useAuth } from './hooks/useAuth'

function App() {
  const { isAuthenticated, user, isLoading } = useAuth()
  
  console.log('App - isAuthenticated:', isAuthenticated, 'user:', user, 'isLoading:', isLoading)

  // 在认证状态初始化完成前显示加载状态
  if (isLoading) {
    return (
      <LocaleProvider>
        <SiteFilterProvider>
          <div className="App" style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh',
            fontSize: '16px',
            color: '#666'
          }}>
            加载中...
          </div>
        </SiteFilterProvider>
      </LocaleProvider>
    )
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
