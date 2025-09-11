import React, { createContext, useContext, useState, ReactNode } from 'react'
import { mockSites } from '../data/mockData'

interface SiteFilterContextType {
  selectedSiteId: string | null
  setSelectedSiteId: (siteId: string | null) => void
  selectedSite: any | null
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
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(mockSites[0]?.id || null)

  const selectedSite = selectedSiteId 
    ? mockSites.find(site => site.id === selectedSiteId) 
    : null

  const value = {
    selectedSiteId,
    setSelectedSiteId,
    selectedSite
  }

  return (
    <SiteFilterContext.Provider value={value}>
      {children}
    </SiteFilterContext.Provider>
  )
}
