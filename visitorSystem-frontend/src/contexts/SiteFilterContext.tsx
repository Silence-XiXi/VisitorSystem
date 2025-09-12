import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { apiService } from '../services/api'

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
      const sitesData = await apiService.getAllSites()
      
      // 转换数据格式以匹配前端期望的格式
      const transformedSites = sitesData.map(site => ({
        id: site.id,
        name: site.name,
        address: site.address,
        code: site.code || '',
        manager: site.manager,
        phone: site.phone,
        status: site.status || 'active'
      }))
      
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
      // 如果API调用失败，使用空数组
      setSites([])
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

  // 组件挂载时加载工地数据
  useEffect(() => {
    loadSites()
  }, [])

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
