import { useState, useEffect, useRef } from 'react'
import { apiService } from '../services/api'
import { useLocale } from '../contexts/LocaleContext'

interface Distributor {
  id: string
  name: string
  contact?: string
  email?: string
}

interface Guard {
  id: string
  name: string
  siteId?: string
  siteName?: string
}

interface User {
  id: string
  username: string
  role: string
  status: string
  siteId?: string
  siteName?: string
  distributor?: Distributor
  guard?: Guard
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const [validationInProgress, setValidationInProgress] = useState(false)
  const hasInitialized = useRef(false)
  
  // 安全地获取翻译函数，如果不在LocaleProvider中则使用默认值
  let t: (key: string) => string
  try {
    const localeContext = useLocale()
    t = localeContext.t
  } catch (error) {
    // 如果不在LocaleProvider中，使用默认的中文翻译
    const translations: Record<string, string> = {
      'auth.usernameRequired': '用户名不能为空',
      'auth.passwordRequired': '密码不能为空',
      'auth.passwordMinLength': '密码长度不能少于6位',
      'auth.serverDataFormatError': '服务器返回数据格式错误',
      'auth.userInfoIncomplete': '用户信息不完整',
      'auth.networkConnectionFailed': '网络连接失败，请检查网络设置',
      'auth.loginFailed': '登录失败',
      'auth.logoutFailed': '登出失败',
      'auth.tokenValidationFailed': 'Token验证失败',
      'auth.loginSuccess': '登录成功',
      'auth.logoutSuccess': '登出成功',
      'auth.parsingUserDataError': '解析用户数据时发生错误',
      'auth.tokenExpired': '登录已过期，请重新登录',
    }
    t = (key: string) => translations[key] || key
  }

  useEffect(() => {
    // 防止重复初始化
    if (hasInitialized.current) {
      return
    }

    const validateAuth = async () => {
      hasInitialized.current = true
      setValidationInProgress(true)
      console.log('useAuth: Starting authentication validation')
      
      // 检查本地存储中是否有用户信息和token
      const storedUser = localStorage.getItem('user')
      const storedToken = localStorage.getItem('access_token')
      
      console.log('useAuth: Stored user exists:', !!storedUser, 'Stored token exists:', !!storedToken)
      
      if (storedUser && storedToken) {
        try {
          const userData = JSON.parse(storedUser)
          console.log('useAuth: Parsed user data:', userData)
          
          // 如果是分判商用户，获取完整的分判商信息
          if (userData.role === 'DISTRIBUTOR') {
            try {
              console.log('useAuth: Fetching distributor profile for user:', userData.username)
              const distributorInfo = await apiService.getDistributorProfile()
              console.log('useAuth: Distributor profile received:', distributorInfo)
              console.log('useAuth: Distributor profile keys:', Object.keys(distributorInfo || {}))
              console.log('useAuth: Distributor sites:', distributorInfo?.sites)
              console.log('useAuth: Distributor sites type:', typeof distributorInfo?.sites)
              console.log('useAuth: Distributor sites is array:', Array.isArray(distributorInfo?.sites))
              setUser({
                ...userData,
                distributor: distributorInfo
              })
            } catch (error) {
              console.error('useAuth: Failed to fetch distributor profile:', error)
              console.error('useAuth: Error details:', error.message)
              console.error('useAuth: Error status:', error.statusCode)
              // 如果获取分判商信息失败，仍然使用基本用户信息
              setUser(userData)
            }
          } else {
            setUser(userData)
          }
          
          setIsAuthenticated(true)
        } catch (error) {
          console.error('useAuth: Error parsing stored user data:', error)
          localStorage.removeItem('user')
          localStorage.removeItem('access_token')
          setUser(null)
          setIsAuthenticated(false)
        }
      } else {
        console.log('useAuth: No stored authentication data')
        // 没有存储的认证信息
        setUser(null)
        setIsAuthenticated(false)
      }
      
      console.log('useAuth: Authentication validation complete, isLoading set to false')
      setIsLoading(false)
      setIsInitialized(true)
      setValidationInProgress(false)
    }

    validateAuth()
  }, []) // 只在组件挂载时执行一次

  const login = async (username: string, password: string): Promise<{ success: boolean; role?: string; error?: string; errorCode?: number }> => {
    try {
      // 基本输入验证
      if (!username.trim()) {
        return { 
          success: false, 
          error: t('auth.usernameRequired'),
          errorCode: 400
        }
      }
      
      if (!password.trim()) {
        return { 
          success: false, 
          error: t('auth.passwordRequired'),
          errorCode: 400
        }
      }

      if (password.length < 6) {
        return { 
          success: false, 
          error: t('auth.passwordMinLength'),
          errorCode: 400
        }
      }

      const response = await apiService.login({ username: username.trim(), password })
      
      // 验证响应数据
      if (!response.access_token || !response.user) {
        return { 
          success: false, 
          error: t('auth.serverDataFormatError'),
          errorCode: 500
        }
      }

      // 验证用户数据完整性
      if (!response.user.id || !response.user.username || !response.user.role) {
        return { 
          success: false, 
          error: t('auth.userInfoIncomplete'),
          errorCode: 500
        }
      }
      
      // 保存token和用户信息
      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('user', JSON.stringify(response.user))
      
      setUser(response.user)
      setIsAuthenticated(true)
      
      return { 
        success: true, 
        role: response.user.role.toLowerCase() // 转换为小写以匹配前端逻辑
      }
    } catch (error: unknown) {
      console.error('Login failed:', error)
      
      // 根据错误类型提供更具体的错误信息
      let errorMessage = t('auth.loginFailed')
      let errorCode = 500
      
      if (error && typeof error === 'object' && 'statusCode' in error) {
        errorCode = (error as { statusCode: number }).statusCode
        if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
          errorMessage = (error as { message: string }).message
        }
      } else if (error && typeof error === 'object' && 'isNetworkError' in error) {
        errorMessage = t('auth.networkConnectionFailed')
        errorCode = 0
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      
      return { 
        success: false, 
        error: errorMessage,
        errorCode
      }
    }
  }

  const logout = async () => {
    try {
      // 调用后端登出API
      await apiService.logout()
    } catch (error) {
      console.error(t('auth.logoutFailed'), error)
    } finally {
      // 清除本地存储
      localStorage.removeItem('user')
      localStorage.removeItem('access_token')
      setUser(null)
      setIsAuthenticated(false)
      setIsLoading(false)
      setIsInitialized(false)
      setValidationInProgress(false)
      hasInitialized.current = false
    }
  }

  // 刷新用户信息
  const refreshUser = async () => {
    try {
      const userData = await apiService.getProfile()
      console.log('useAuth: Refreshed user data:', userData)
      
      if (userData && userData.id && userData.username && userData.role) {
        // 如果是分判商用户，获取完整的分判商信息
        if (userData.role === 'DISTRIBUTOR') {
          try {
            console.log('useAuth: Fetching distributor profile for user:', userData.username)
            const distributorInfo = await apiService.getDistributorProfile()
            console.log('useAuth: Distributor profile received:', distributorInfo)
            console.log('useAuth: Distributor profile keys:', Object.keys(distributorInfo || {}))

            setUser({
              ...userData,
              distributor: distributorInfo
            })
          } catch (error) {
            console.error('useAuth: Failed to fetch distributor profile:', error)
            setUser(userData)
          }
        } else {
          setUser(userData)
        }
        
        setIsAuthenticated(true)
      } else {
        console.error('useAuth: Invalid user data received:', userData)
        setIsAuthenticated(false)
        setUser(null)
      }
    } catch (error) {
      console.error('useAuth: Failed to refresh user data:', error)
      setIsAuthenticated(false)
      setUser(null)
    }
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshUser
  }
}
