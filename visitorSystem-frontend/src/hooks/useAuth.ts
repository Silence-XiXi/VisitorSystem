import { useState, useEffect } from 'react'
import { apiService } from '../services/api'

interface User {
  id: string
  username: string
  role: string
  status: string
  siteId?: string
  siteName?: string
  distributor?: any
  guard?: any
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 检查本地存储中是否有用户信息和token
    const storedUser = localStorage.getItem('user')
    const storedToken = localStorage.getItem('access_token')
    
    if (storedUser && storedToken) {
      try {
        const userData = JSON.parse(storedUser)
        setUser(userData)
        setIsAuthenticated(true)
        
        // 验证token是否仍然有效
        apiService.getProfile()
          .then((profile) => {
            // Token有效，更新用户信息
            setUser(profile)
            localStorage.setItem('user', JSON.stringify(profile))
          })
          .catch(() => {
            // Token无效，清除本地存储
            localStorage.removeItem('user')
            localStorage.removeItem('access_token')
            setUser(null)
            setIsAuthenticated(false)
          })
      } catch (error) {
        console.error('Error parsing stored user data:', error)
        localStorage.removeItem('user')
        localStorage.removeItem('access_token')
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (username: string, password: string): Promise<{ success: boolean; role?: string; error?: string }> => {
    try {
      const response = await apiService.login({ username, password })
      
      // 保存token和用户信息
      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('user', JSON.stringify(response.user))
      
      setUser(response.user)
      setIsAuthenticated(true)
      
      return { 
        success: true, 
        role: response.user.role.toLowerCase() // 转换为小写以匹配前端逻辑
      }
    } catch (error) {
      console.error('Login failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '登录失败'
      }
    }
  }

  const logout = async () => {
    try {
      // 调用后端登出API
      await apiService.logout()
    } catch (error) {
      console.error('Logout API call failed:', error)
    } finally {
      // 清除本地存储
      localStorage.removeItem('user')
      localStorage.removeItem('access_token')
      setUser(null)
      setIsAuthenticated(false)
    }
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout
  }
}
