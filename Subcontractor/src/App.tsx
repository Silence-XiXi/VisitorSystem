import { Routes, Route, Navigate } from 'react-router-dom'
import { LocaleProvider } from './contexts/LocaleContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import WorkerManagement from './pages/WorkerManagement'
import DistributorLayout from './components/DistributorLayout'
import { useAuth } from './hooks/useAuth'

function App() {
  const { isAuthenticated, user } = useAuth()
  
  console.log('App - isAuthenticated:', isAuthenticated, 'user:', user)

  return (
    <LocaleProvider>
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
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </LocaleProvider>
  )
}

export default App
