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

  const login = (username: string, password: string): Promise<{ success: boolean; role?: string }> => {
    return new Promise((resolve) => {
      // 模拟登录验证
      setTimeout(() => {
        if (username && password) {
          // 分判商账号列表
          const subcontractorAccounts = [
            { username: 'bjadmin', password: '123456', id: '1', name: '北京建筑公司' },
            { username: 'shadmin', password: '123456', id: '2', name: '上海建设集团' },
            { username: 'gzadmin', password: '123456', id: '3', name: '广州工程公司' },
            { username: 'szadmin', password: '123456', id: '4', name: '深圳建筑集团' },
            { username: 'cdadmin', password: '123456', id: '5', name: '成都建设公司' }
          ]
          
          // 管理员账号列表
          const adminAccounts = [
            { username: 'admin', password: '123456', id: 'admin1' },
            { username: 'superadmin', password: 'super123', id: 'admin2' },
            { username: 'manager1', password: 'mgr123', id: 'admin3' },
            { username: 'manager2', password: 'mgr456', id: 'admin4' },
            { username: 'system', password: 'sys123', id: 'admin5' }
          ]
          
          // 先检查是否为分判商账号
          console.log('Checking subcontractor accounts for:', username, password)
          const subcontractorAccount = subcontractorAccounts.find(acc => acc.username === username && acc.password === password)
          console.log('Found subcontractor account:', subcontractorAccount)
          if (subcontractorAccount) {
            const userData: User = {
              id: subcontractorAccount.id,
              username: subcontractorAccount.username,
              role: 'subcontractor'
            }
            console.log('Setting user data:', userData)
            setUser(userData)
            setIsAuthenticated(true)
            localStorage.setItem('user', JSON.stringify(userData))
            console.log('User data set, resolving with success')
            resolve({ success: true, role: 'subcontractor' })
            return
          }
          
          // 再检查是否为管理员账号
          const adminAccount = adminAccounts.find(acc => acc.username === username && acc.password === password)
          if (adminAccount) {
            const userData: User = {
              id: adminAccount.id,
              username,
              role: 'admin'
            }
            setUser(userData)
            setIsAuthenticated(true)
            localStorage.setItem('user', JSON.stringify(userData))
            resolve({ success: true, role: 'admin' })
            return
          }
          
          // 账号不存在或密码错误
          resolve({ success: false })
        } else {
          resolve({ success: false })
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
