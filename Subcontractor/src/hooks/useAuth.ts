import { useState, useEffect } from 'react'

interface User {
  id: string
  username: string
  role: string
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // 检查本地存储中是否有用户信息
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      const userData = JSON.parse(storedUser)
      setUser(userData)
      setIsAuthenticated(true)
    }
  }, [])

  const login = (username: string, password: string, role: string): Promise<boolean> => {
    return new Promise((resolve) => {
      // 模拟登录验证
      setTimeout(() => {
        if (username && password && role) {
          const userData: User = {
            id: Date.now().toString(),
            username,
            role
          }
          setUser(userData)
          setIsAuthenticated(true)
          localStorage.setItem('user', JSON.stringify(userData))
          resolve(true)
        } else {
          resolve(false)
        }
      }, 1000)
    })
  }

  const logout = () => {
    setUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem('user')
  }

  return {
    user,
    isAuthenticated,
    login,
    logout
  }
}
