import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { apiService } from '../services/api'
import { useAuth } from '../hooks/useAuth'

interface Site {
  id: string
  name: string
  address: string
  code?: string
  manager?: string
  phone?: string
  status?: 'active' | 'inactive' | 'suspended'
}

interface SiteFilterContextType {
  selectedSiteId: string | null
  setSelectedSiteId: (siteId: string | null) => void
  selectedSite: Site | null
  sites: Site[]
  loading: boolean
  refreshSites: () => Promise<void>
}

const SiteFilterContext = createContext<SiteFilterContextType | undefined>(undefined)

export const useSiteFilter = () => {
  const context = useContext(SiteFilterContext)
  if (context === undefined) {
    throw new Error('useSiteFilter must be used within a SiteFilterProvider')
  }
  return context
}

interface SiteFilterProviderProps {
  children: ReactNode
}

export const SiteFilterProvider: React.FC<SiteFilterProviderProps> = ({ children }) => {
  const { user, isLoading: authLoading } = useAuth() // 获取用户信息和加载状态
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(() => {
    // 从localStorage恢复上次选择的工地
    try {
      const saved = localStorage.getItem('selectedSiteId')
      return saved || null
    } catch (error) {
      console.error('Failed to load selectedSiteId from localStorage:', error)
      return null
    }
  })
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(false)

  // 加载工地数据
  const loadSites = async () => {
    try {
      setLoading(true)
      
      // 如果用户信息还在加载中，等待加载完成
      if (authLoading) {
        console.log('Auth still loading, skipping site load')
        return
      }
      
      // 如果没有用户信息，使用默认站点
      if (!user) {
        console.log('No user info, using default sites')
        const defaultSites = [
          {
            id: 'default-site',
            name: '默认工地',
            address: '默认地址',
            code: 'DEFAULT',
            manager: '默认负责人',
            phone: '000-0000-0000',
            status: 'active'
          }
        ]
        setSites(defaultSites)
        return
      }
      
      // 根据用户角色使用不同的API
      let transformedSites = []
      
      if (user?.role?.toLowerCase() === 'distributor') {
        // 分判商用户：从用户信息中获取关联的站点，或使用模拟数据
        if (user.distributor?.sites && user.distributor.sites.length > 0) {
          transformedSites = user.distributor.sites.map(site => ({
            id: site.id,
            name: site.name,
            address: '', // 分判商可能没有完整站点信息
            code: '',
            manager: '',
            phone: '',
            status: 'active'
          }))
        } else {
          // 使用模拟数据作为后备
          transformedSites = [
            {
              id: 'default-site',
              name: '默认工地',
              address: '默认地址',
              code: 'DEFAULT',
              manager: '默认负责人',
              phone: '000-0000-0000',
              status: 'active'
            }
          ]
        }
      } else if (user?.role?.toLowerCase() === 'guard') {
        // 门卫用户：从用户信息中获取关联的站点
        if (user.guard?.site) {
          transformedSites = [{
            id: user.guard.site.id,
            name: user.guard.site.name,
            address: user.guard.site.address || '',
            code: user.guard.site.code || '',
            manager: user.guard.site.manager || '',
            phone: user.guard.site.phone || '',
            status: 'active'
          }]
        } else if (user.guard?.siteId) {
          // 如果只有siteId，使用默认信息
          transformedSites = [{
            id: user.guard.siteId,
            name: '当前工地',
            address: '',
            code: '',
            manager: '',
            phone: '',
            status: 'active'
          }]
        } else {
          // 使用模拟数据作为后备
          transformedSites = [
            {
              id: 'default-site',
              name: '默认工地',
              address: '默认地址',
              code: 'DEFAULT',
              manager: '默认负责人',
              phone: '000-0000-0000',
              status: 'active'
            }
          ]
        }
      } else {
        // 管理员用户：使用完整API
        const sitesData = await apiService.getAllSites()
        transformedSites = sitesData
          .filter(site => site.status === 'ACTIVE') // 只显示启用的工地
          .map(site => ({
            id: site.id,
            name: site.name,
            address: site.address,
            code: site.code || '',
            manager: site.manager,
            phone: site.phone,
            status: 'active' // 统一转换为小写
          }))
      }
      
      setSites(transformedSites)
      
      // 检查当前选中的工地是否仍然有效
      if (selectedSiteId) {
        const isValidSite = transformedSites.some(site => site.id === selectedSiteId)
        if (!isValidSite) {
          // 如果当前选中的工地无效，清除选择
          setSelectedSiteId(null)
          localStorage.removeItem('selectedSiteId')
        }
      }
      
      // 如果没有选中的工地且有可用工地，自动选择第一个
      if (!selectedSiteId && transformedSites.length > 0) {
        handleSetSelectedSiteId(transformedSites[0].id)
      }
    } catch (error) {
      console.error('Failed to load sites:', error)
      // 如果API调用失败，使用默认站点
      const defaultSites = [
        {
          id: 'default-site',
          name: '默认工地',
          address: '默认地址',
          code: 'DEFAULT',
          manager: '默认负责人',
          phone: '000-0000-0000',
          status: 'active'
        }
      ]
      setSites(defaultSites)
    } finally {
      setLoading(false)
    }
  }

  // 包装的setSelectedSiteId函数，同时更新localStorage
  const handleSetSelectedSiteId = (siteId: string | null) => {
    setSelectedSiteId(siteId)
    try {
      if (siteId) {
        localStorage.setItem('selectedSiteId', siteId)
      } else {
        localStorage.removeItem('selectedSiteId')
      }
    } catch (error) {
      console.error('Failed to save selectedSiteId to localStorage:', error)
    }
  }

  // 刷新工地数据
  const refreshSites = async () => {
    await loadSites()
  }

  // 组件挂载时加载工地数据，监听用户认证状态变化
  useEffect(() => {
    // 只有在用户认证完成后才加载站点数据
    if (!authLoading) {
      loadSites()
    }
  }, [authLoading, user])

  const selectedSite = selectedSiteId 
    ? sites.find(site => site.id === selectedSiteId) 
    : null

  const value = {
    selectedSiteId,
    setSelectedSiteId: handleSetSelectedSiteId,
    selectedSite,
    sites,
    loading,
    refreshSites
  }

  return (
    <SiteFilterContext.Provider value={value}>
      {children}
    </SiteFilterContext.Provider>
  )
}
