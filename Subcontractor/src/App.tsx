import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { LocaleProvider } from './contexts/LocaleContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import WorkerManagement from './pages/WorkerManagement'
import { useAuth } from './hooks/useAuth'

function App() {
  const { isAuthenticated } = useAuth()

  return (
    <LocaleProvider>
      <div className="App">
        <Routes>
          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} 
          />
          <Route 
            path="/dashboard" 
            element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/workers" 
            element={isAuthenticated ? <WorkerManagement /> : <Navigate to="/login" replace />} 
          />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </LocaleProvider>
  )
}

export default App
