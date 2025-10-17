import { useState, useEffect, useRef, useCallback } from 'react'
import { apiService, setGlobalLogoutFunction } from '../services/api'
import { useLocale } from '../contexts/LocaleContext'

// 扩展 Window 接口以支持登出标记
declare global {
  interface Window {
    __isLoggingOut?: boolean;
  }
}

interface Distributor {
  id: string
  name: string
  contactName?: string
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
  const hasInitialized = useRef(false)

  // 翻译函数处理
  let t: (key: string) => string
  try {
    const localeContext = useLocale()
    t = localeContext.t
  } catch (error) {
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
      'auth.alreadyLoggedIn': '您已经登录，无需重复登录',
    }
    t = (key: string) => translations[key] || key
  }

  // 初始化逻辑
  useEffect(() => {
    if (hasInitialized.current || isAuthenticated) {
      return
    }

    const validateAuth = async () => {
      hasInitialized.current = true
      
      const storedUser = localStorage.getItem('user')
      const storedToken = localStorage.getItem('access_token')
      
      if (storedUser && storedToken) {
        try {
          const userData = JSON.parse(storedUser)
          const normalizedUserData = {
            ...userData,
            role: userData.role.toLowerCase()
          }
          
          if (normalizedUserData.role === 'distributor') {
            try {
              const distributorInfo = await apiService.getDistributorProfile()
              setUser({...normalizedUserData, distributor: distributorInfo})
            } catch (error) {
              console.error('Failed to fetch distributor profile:', error)
              setUser(normalizedUserData)
            }
          } else {
            setUser(normalizedUserData)
          }
          
          setIsAuthenticated(true)
        } catch (error) {
          console.error('Error parsing stored user data:', error)
          localStorage.removeItem('user')
          localStorage.removeItem('access_token')
          setUser(null)
          setIsAuthenticated(false)
        }
      } else {
        setUser(null)
        setIsAuthenticated(false)
      }
      
      setIsLoading(false)
    }

    validateAuth()
  }, [isAuthenticated])

  // 登录函数
  const login = async (username: string, password: string): Promise<{ success: boolean; role?: string; error?: string; errorCode?: number }> => {
    // 已登录状态下不允许重复登录
    if (isAuthenticated) {
      return { success: false, error: t('auth.alreadyLoggedIn'), errorCode: 400 };
    }
    
    try {
      if (!username.trim()) {
        return { success: false, error: t('auth.usernameRequired'), errorCode: 400 }
      }
      
      if (!password.trim()) {
        return { success: false, error: t('auth.passwordRequired'), errorCode: 400 }
      }

      if (password.length < 6) {
        return { success: false, error: t('auth.passwordMinLength'), errorCode: 400 }
      }

      const response = await apiService.login({ username: username.trim(), password })
      
      if (!response.access_token || !response.user) {
        return { success: false, error: t('auth.serverDataFormatError'), errorCode: 500 }
      }

      if (!response.user.id || !response.user.username || !response.user.role) {
        return { success: false, error: t('auth.userInfoIncomplete'), errorCode: 500 }
      }
      
      const normalizedUser = {
        ...response.user,
        role: response.user.role.toLowerCase()
      }
      
      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('user', JSON.stringify(normalizedUser))
      
      setUser(normalizedUser)
      setIsAuthenticated(true)
      
      return { success: true, role: normalizedUser.role }
    } catch (error: unknown) {
      console.error('Login failed:', error)
      
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
      
      return { success: false, error: errorMessage, errorCode }
    }
  }

  // 取消所有 pending 请求（简化实现）
  const cancelAllRequests = () => {
    // 这里可以添加其他 HTTP 客户端的取消逻辑
    // 目前项目使用的是 fetch 或其他 HTTP 客户端
  }

  // 登出函数（核心修改）
  const logout = useCallback(async () => {
    if (window.__isLoggingOut) return;
    window.__isLoggingOut = true;

    try {
      cancelAllRequests();
      await apiService.logout();
      // console.log(t('auth.logoutSuccess'));
    } catch (error) {
      console.error(t('auth.logoutFailed'), error);
    } finally {
      // 清除存储
      localStorage.removeItem('user');
      localStorage.removeItem('access_token');
      
      // 重置状态
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      hasInitialized.current = false;
      
      // 强制跳转（确保生效）
      if (window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
      
      window.__isLoggingOut = false;
    }
  }, [t]);

  // 设置全局登出函数，供 API 拦截器使用
  useEffect(() => {
    setGlobalLogoutFunction(logout);
  }, [logout]);

  // 刷新用户信息
  const refreshUser = async () => {
    try {
      const userData = await apiService.getProfile()
      
      if (userData && userData.id && userData.username && userData.role) {
        const normalizedUserData = {
          ...userData,
          role: userData.role.toLowerCase()
        }
        
        if (normalizedUserData.role === 'distributor') {
          try {
            const distributorInfo = await apiService.getDistributorProfile()
            setUser({...normalizedUserData, distributor: distributorInfo})
          } catch (error) {
            console.error('Failed to fetch distributor profile:', error)
            setUser(normalizedUserData)
          }
        } else {
          setUser(normalizedUserData)
        }
        
        setIsAuthenticated(true)
      } else {
        console.error('Invalid user data received:', userData)
        setIsAuthenticated(false)
        setUser(null)
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error)
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