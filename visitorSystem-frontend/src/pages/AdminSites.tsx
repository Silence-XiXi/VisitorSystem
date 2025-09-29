import React, { useMemo, useState, useEffect } from 'react'
import { Card, Table, Button, Space, Modal, Form, Input, Select, Tag, message, Row, Col, Tabs, Upload } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined, ExclamationCircleOutlined, CheckCircleOutlined, StopOutlined, HomeOutlined, TeamOutlined, UploadOutlined, DownloadOutlined, SendOutlined, CloseOutlined } from '@ant-design/icons'
import { Site, Distributor, Guard } from '../types/worker'
import { mockSites, mockDistributors, mockGuards } from '../data/mockData'
import { 
  exportSitesToExcel, 
  exportDistributorsToExcel, 
  exportGuardsToExcel,
  readSiteExcelFile,
  readDistributorExcelFile,
  readGuardExcelFile,
  generateSiteImportTemplate,
  generateDistributorImportTemplate,
  generateGuardImportTemplate
} from '../utils/excelUtils'
import { useLocale } from '../contexts/LocaleContext'
import { useSiteFilter } from '../contexts/SiteFilterContext'
import { apiService } from '../services/api'

const AdminSites: React.FC = () => {
  const { t, locale, messages } = useLocale()
  const { refreshSites, selectedSiteId } = useSiteFilter()
  // 工地管理状态
  const [sites, setSites] = useState<Site[]>(mockSites)
  const [siteModalOpen, setSiteModalOpen] = useState(false)
  const [editingSite, setEditingSite] = useState<Site | null>(null)
  const [siteForm] = Form.useForm()
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([])

  // 分判商管理状态
  const [distributors, setDistributors] = useState<Distributor[]>(mockDistributors)
  const [distributorModalOpen, setDistributorModalOpen] = useState(false)
  const [editingDistributor, setEditingDistributor] = useState<Distributor | null>(null)
  const [distributorForm] = Form.useForm()
  const [selectedDistributorIds, setSelectedDistributorIds] = useState<string[]>([])

  // 门卫管理状态
  const [guards, setGuards] = useState<Guard[]>(mockGuards)
  const [guardModalOpen, setGuardModalOpen] = useState(false)
  const [editingGuard, setEditingGuard] = useState<Guard | null>(null)
  const [guardForm] = Form.useForm()
  const [selectedGuardIds, setSelectedGuardIds] = useState<string[]>([])

  // 工地筛选状态
  const [siteStatusFilters, setSiteStatusFilters] = useState<string[]>([])
  const [siteManagerFilters, setSiteManagerFilters] = useState<string[]>([])
  const [siteKeyword, setSiteKeyword] = useState<string>('')

  // 分判商筛选状态
  const [distributorStatusFilters, setDistributorStatusFilters] = useState<string[]>([])
  const [distributorKeyword, setDistributorKeyword] = useState<string>('')

  // 门卫筛选状态
  const [guardKeyword, setGuardKeyword] = useState<string>('')
  const [guardStatusFilters, setGuardStatusFilters] = useState<string[]>([])
  
  // 标签页状态
  const [activeTab, setActiveTab] = useState<string>('distributors')
  
  // 分页状态
  const [sitePagination, setSitePagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  })
  const [distributorPagination, setDistributorPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  })
  const [guardPagination, setGuardPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  })
  
  // 加载状态
  const [loading, setLoading] = useState(false)

  // 加载数据
  useEffect(() => {
    loadData()
  }, [])

  // 监听全局工地筛选变化
  useEffect(() => {
    // 全局工地筛选变化时，数据会自动通过useMemo重新筛选
    // 不需要额外的状态清理
  }, [selectedSiteId])


  // 分页处理函数
  const handleSitePaginationChange = (page: number, pageSize?: number) => {
    setSitePagination(prev => ({
      ...prev,
      current: page,
      pageSize: pageSize || prev.pageSize
    }))
  }

  const handleDistributorPaginationChange = (page: number, pageSize?: number) => {
    setDistributorPagination(prev => ({
      ...prev,
      current: page,
      pageSize: pageSize || prev.pageSize
    }))
  }

  const handleGuardPaginationChange = (page: number, pageSize?: number) => {
    setGuardPagination(prev => ({
      ...prev,
      current: page,
      pageSize: pageSize || prev.pageSize
    }))
  }

  // 状态转换辅助函数
  const transformSiteStatus = (status: string) => {
    return status === 'ACTIVE' ? 'active' : 'inactive'
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const [sitesData, distributorsData, guardsData] = await Promise.all([
        apiService.getAllSites(),
        apiService.getAllDistributors(),
        apiService.getAllGuards()
      ])
      
      // 转换数据格式以匹配前端期望的格式
      const transformedSites = sitesData.map(site => ({
        id: site.id,
        name: site.name,
        address: site.address,
        code: site.code || '',
        manager: site.manager,
        phone: site.phone,
        status: transformSiteStatus(site.status),
        distributorIds: site.distributorIds || []
      }))
      
      const transformedDistributors = distributorsData.map(distributor => ({
        id: distributor.id,
        distributorId: distributor.distributorId,
        name: distributor.name,
        contactName: distributor.contactName,
        phone: distributor.phone,
        email: distributor.email,
        whatsapp: distributor.whatsapp,
        accountUsername: distributor.user?.username || distributor.name,
        accountStatus: (distributor.user?.status === 'ACTIVE' ? 'active' : 'disabled') as 'active' | 'disabled',
        siteIds: distributor.siteIds || [],
        userId: distributor.userId // 保留用户ID用于状态更新
      }))
      
      const transformedGuards = guardsData.map(guard => ({
        id: guard.id,
        guardId: guard.guardId,
        name: guard.name,
        siteId: guard.siteId,
        phone: guard.phone,
        email: guard.email,
        whatsapp: guard.whatsapp,
        accountUsername: guard.user?.username || guard.guardId,
        accountStatus: (guard.status === 'ACTIVE' ? 'active' : 'disabled') as 'active' | 'disabled',
        createdAt: guard.createdAt,
        updatedAt: guard.updatedAt
      }))
      
      setSites(transformedSites)
      setDistributors(transformedDistributors)
      setGuards(transformedGuards)
      
      // 更新分页总数
      setSitePagination(prev => ({ ...prev, total: transformedSites.length }))
      setDistributorPagination(prev => ({ ...prev, total: transformedDistributors.length }))
      setGuardPagination(prev => ({ ...prev, total: transformedGuards.length }))
    } catch (error) {
      console.error('Failed to load data:', error)
      message.error('加载数据失败，使用本地数据')
      // 如果API调用失败，继续使用mock数据
    } finally {
      setLoading(false)
    }
  }

  // 显示发送方式选择对话框（新增分判商时使用）
  const showSendMethodModal = (distributor: Distributor, password: string) => {
    const hasEmail = distributor.email && distributor.email.trim()
    const hasWhatsApp = distributor.whatsapp && distributor.whatsapp.trim()
    
    // 获取系统登录链接
    const frontendUrl = window.location.origin
    const loginUrl = `${frontendUrl}/login`
    
    // 获取当前语言
    const currentLocale = localStorage.getItem('locale') || 'zh-CN'
    
    // 发送邮件的方法
    const sendEmail = async () => {
      try {
        message.loading({ content: t('common.sending'), key: 'sendEmail' })
        
        // 准备请求数据
        const requestData = {
          distributorEmail: distributor.email || '',
          distributorName: distributor.name,
          username: distributor.accountUsername || '',
          password: password,
          loginUrl: loginUrl,
          language: currentLocale
        }
        
        // 检查必填字段
        if (!requestData.distributorEmail) {
          message.error({ content: '邮箱地址不能为空', key: 'sendEmail' })
          return
        }
        
        console.log('发送分判商账号邮件请求数据:', requestData)
        
        // 打印所有参数的长度
        Object.entries(requestData).forEach(([key, value]) => {
          console.log(`${key} 长度: ${String(value).length}`)
        })
        
        // 发送邮件
        console.log('开始发送分判商账号邮件...')
        const result = await apiService.sendDistributorAccountEmail(requestData)
        console.log('发送分判商账号邮件结果:', result)
        
        if (result.success) {
          message.success({ content: t('admin.sendByEmailSuccess').replace('{name}', distributor.contactName || ''), key: 'sendEmail' })
        } else {
          // 显示详细的错误信息
          let errorMsg = result.message || t('common.operationFailed')
          if (result.error) {
            errorMsg += `\n\n错误详情: ${result.error}`
          }
          if (result.step) {
            errorMsg += `\n失败步骤: ${result.step}`
          }
          
          message.error({ content: errorMsg, key: 'sendEmail', duration: 10 })
        }
      } catch (error: any) {
        console.error('发送邮件异常:', error)
        message.error({ 
          content: t('common.operationFailed') + ': ' + (error?.message || t('common.unknownError')),
          key: 'sendEmail',
          duration: 10
        })
      }
    }
    
    // 不再需要WhatsApp发送方法
    
    if (!hasEmail && !hasWhatsApp) {
      // 如果没有联系方式，直接显示成功信息
      Modal.success({
        title: t('admin.distributorAddedSuccess').replace('{name}', distributor.name),
        content: (
          <div>
            <p>{t('admin.accountInfo').replace('{username}', distributor.accountUsername || '')}</p>
            <p>{t('admin.passwordInfo').replace('{password}', password)}</p>
            <p style={{ marginTop: '16px', color: '#ff4d4f' }}>{t('admin.noContactInfo')}</p>
          </div>
        ),
        okText: t('common.ok')
      })
      return
    }
    
    // 显示发送邮件对话框
    // 准备发送邮件
    
    Modal.confirm({
      title: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{t('admin.distributorAddedSuccess')}</span>
          <Button 
            type="text" 
            size="small" 
            icon={<CloseOutlined />} 
            onClick={() => Modal.destroyAll()}
            style={{ marginRight: -8 }}
          />
        </div>
      ),
      content: (
        <div>
          <p>{t('admin.distributorAddedSuccess').replace('{name}', distributor.name)}</p>
          <p>{t('admin.accountInfo').replace('{username}', distributor.accountUsername || '')}</p>
          <p>{t('admin.passwordInfo').replace('{password}', password)}</p>
          {hasEmail && <p style={{ marginTop: '16px', color: '#666' }}>{t('admin.emailSendTip')}</p>}
        </div>
      ),
      okText: hasEmail ? t('admin.sendByEmail') : t('common.ok'),
      cancelText: t('common.cancel'),
      cancelButtonProps: { style: { display: 'none' } }, // 隐藏Cancel按钮
      okButtonProps: { disabled: !hasEmail },
      onOk: () => {
        // 发送Email
        if (hasEmail) {
          sendEmail()
        }
      }
    })
  }



  // 重置分判商密码
  const handleResetPassword = (record: Distributor) => {
    Modal.confirm({
      title: t('admin.resetPasswordTitle'),
      content: (
        <div>
          <p>{t('admin.resetPasswordConfirm').replace('{name}', record.name)}</p>
          <p style={{ color: '#999' }}>{t('admin.resetPasswordTip')}</p>
        </div>
      ),
      okText: t('admin.confirm'),
      cancelText: t('admin.cancel'),
      onOk: async () => {
        try {
          const result = await apiService.resetDistributorPassword(record.id)
          console.log('密码重置成功:', result)
          
          // 显示成功消息，包含新密码信息
          Modal.success({
            title: t('admin.resetPasswordSuccess'),
            content: (
              <div>
                <p>{t('admin.resetPasswordSuccessMessage').replace('{name}', result.distributorName)}</p>
                <p><strong>{t('admin.newPassword')}: {result.newPassword}</strong></p>
                <p style={{ color: '#ff4d4f', fontSize: '12px' }}>{t('admin.passwordSecurityTip')}</p>
              </div>
            ),
            width: 400
          })
        } catch (error: unknown) {
          console.error('重置密码失败:', error)
          let errorMessage = '重置密码失败'
          if (error && typeof error === 'object' && 'response' in error) {
            const apiError = error as { response?: { data?: { message?: string } } }
            if (apiError.response?.data?.message) {
              errorMessage = apiError.response.data.message
            }
          } else if (error && typeof error === 'object' && 'message' in error) {
            const simpleError = error as { message: string }
            errorMessage = simpleError.message
          }
          message.error(errorMessage)
        }
      }
    })
  }

  // 切换工地状态
  const handleToggleSiteStatus = async (record: Site) => {
    const newStatus = record.status === 'active' ? 'inactive' : 'active'
    const statusText = newStatus === 'active' ? t('admin.enableSiteTitle') : t('admin.disableSiteTitle')
    const statusAction = newStatus === 'active' ? t('admin.enableSiteConfirm') : t('admin.disableSiteConfirm')
    
    Modal.confirm({
      title: statusText,
      content: (
        <div>
          <p>{statusAction.replace('{name}', record.name)}</p>
        </div>
      ),
      okText: t('admin.confirm'),
      cancelText: t('admin.cancel'),
      onOk: async () => {
        try {
          // 调用后端API更新工地状态
          const siteData = {
            name: record.name,
            address: record.address,
            code: record.code,
            manager: record.manager,
            phone: record.phone,
            status: newStatus === 'active' ? 'active' : 'inactive', // 转换为后端期望的格式
            distributorIds: record.distributorIds || []
          }
          
          const updatedSite = await apiService.updateSite(record.id, siteData)
          
          // 转换后端返回的状态格式
          const transformedUpdatedSite = {
            ...updatedSite,
            status: transformSiteStatus(updatedSite.status)
          }
          
          // 更新本地状态
          setSites(prev => prev.map(s => s.id === record.id ? transformedUpdatedSite : s))
          
          // 刷新全局工地筛选器
          await refreshSites()
          
          const successMessage = newStatus === 'active' ? t('admin.enableSiteSuccess') : t('admin.disableSiteSuccess')
          message.success(successMessage.replace('{name}', record.name))
        } catch (error) {
          console.error('更新工地状态失败:', error)
          message.error(t('admin.updateSiteStatusFailed'))
        }
      }
    })
  }

  // 切换分判商账号状态
  const handleToggleDistributorStatus = (record: Distributor) => {
    const newStatus = record.accountStatus === 'active' ? 'disabled' : 'active'
    const statusText = newStatus === 'active' ? t('admin.enableDistributorTitle') : t('admin.disableDistributorTitle')
    const statusAction = newStatus === 'active' ? t('admin.enableDistributorConfirm') : t('admin.disableDistributorConfirm')
    
    Modal.confirm({
      title: statusText,
      content: (
        <div>
          <p>{statusAction.replace('{name}', record.name)}</p>
          {newStatus === 'disabled' && (
            <p style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '8px' }}>
              {t('admin.disableAccountWarning')}
            </p>
          )}
        </div>
      ),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okType: newStatus === 'disabled' ? 'danger' : 'primary',
      onOk: async () => {
        try {
          // 调用后端API更新用户状态
          await apiService.updateUserStatus(record.userId!, newStatus.toUpperCase())
          
          // 更新前端状态
        setDistributors(prev => prev.map(d => d.id === record.id ? { ...d, accountStatus: newStatus } : d))
          
        const successMessage = newStatus === 'active' ? t('admin.enableDistributorSuccess') : t('admin.disableDistributorSuccess')
        message.success(successMessage.replace('{name}', record.name))
        } catch (error: unknown) {
          console.error('切换分判商状态失败:', error)
          let errorMessage = '切换状态失败'
          
          if (error && typeof error === 'object' && 'response' in error) {
            const apiError = error as { response?: { data?: { message?: string } } }
            if (apiError.response?.data?.message) {
              errorMessage = apiError.response.data.message
            }
          } else if (error && typeof error === 'object' && 'message' in error) {
            const simpleError = error as { message: string }
            errorMessage = simpleError.message
          }
          
          message.error(errorMessage)
        }
      }
    })
  }

  // 工地表格列定义
  const siteColumns = [
    { title: t('admin.siteCode'), dataIndex: 'code', key: 'code', width: 120 },
    { title: t('admin.siteName'), dataIndex: 'name', key: 'name', width: 160 },
    { title: t('admin.siteAddress'), dataIndex: 'address', key: 'address' },
    { title: t('admin.siteManager'), dataIndex: 'manager', key: 'manager', width: 120 },
    { title: t('admin.sitePhone'), dataIndex: 'phone', key: 'phone', width: 140 },
    { title: t('admin.siteStatus'), dataIndex: 'status', key: 'status', width: 100, render: (s?: string) => {
      const map: Record<string, { color: string; text: string }> = { 
        active: { color: 'green', text: t('admin.siteActive') }, 
        inactive: { color: 'red', text: t('admin.siteInactive') }, 
        suspended: { color: 'orange', text: t('admin.siteSuspended') } 
      }
      const cfg = map[s || 'active'] || map['active']
      return <Tag color={cfg.color}>{cfg.text}</Tag>
    } },
    // 隐藏关联分判商列
    // { title: '关联分判商', dataIndex: 'distributorIds', key: 'distributorIds', width: 200, render: (distributorIds?: string[]) => {
    //   if (!distributorIds || distributorIds.length === 0) return '-'
    //   return (
    //     <div>
    //       {distributorIds.map(distributorId => {
    //         const distributor = distributors.find(d => d.id === distributorId)
    //         return distributor ? (
    //           <Tag key={distributorId} color="purple" style={{ marginBottom: 2 }}>
    //             {distributor.name}
    //           </Tag>
    //         ) : null
    //       })}
    //     </div>
    //   )
    // } },
    { title: t('common.actions'), key: 'actions', width: 180, render: (_: unknown, record: Site) => (
      <Space style={{ justifyContent: 'flex-end' }}>
        <Button 
          size="small" 
          icon={<EditOutlined />} 
          onClick={() => { setEditingSite(record); siteForm.setFieldsValue(record); setSiteModalOpen(true) }}
          title={t('admin.editTooltip')}
        />
        <Button 
          size="small" 
          icon={record.status === 'active' ? <StopOutlined /> : <CheckCircleOutlined />}
          type={record.status === 'active' ? 'default' : 'primary'}
          onClick={() => handleToggleSiteStatus(record)}
          title={record.status === 'active' ? t('admin.disableTooltip') : t('admin.enableTooltip')}
        />
        <Button 
          danger 
          size="small" 
          icon={<DeleteOutlined />} 
          onClick={async () => {
            setSites(prev => prev.filter(s => s.id !== record.id))
            await refreshSites()
          }}
          title={t('admin.deleteTooltip')}
        />
      </Space>
    )}
  ]

  // 分判商表格列定义
  const distributorColumns = [
    { title: t('admin.distributorId'), dataIndex: 'distributorId', key: 'distributorId', width: 100 },
    { title: t('admin.distributorName'), dataIndex: 'name', key: 'name', width: 160 },
    { title: t('admin.distributorContact'), dataIndex: 'contactName', key: 'contactName', width: 120 },
    { title: t('admin.distributorPhone'), dataIndex: 'phone', key: 'phone', width: 140 },
    { title: t('admin.distributorEmail'), dataIndex: 'email', key: 'email', width: 200 },
    { title: t('admin.distributorWhatsapp'), dataIndex: 'whatsapp', key: 'whatsapp', width: 160 },
    { title: t('admin.distributorSite'), dataIndex: 'siteIds', key: 'siteIds', width: 200, render: (siteIds?: string[]) => {
      if (!siteIds || siteIds.length === 0) return '-'
      return (
        <div>
          {siteIds.map(siteId => {
            const site = sites.find(s => s.id === siteId)
            return site ? (
              <Tag key={siteId} color="blue" style={{ marginBottom: 2 }}>
                {site.name}
              </Tag>
            ) : null
          })}
        </div>
      )
    } },
    { title: t('admin.distributorAccount'), dataIndex: 'accountUsername', key: 'accountUsername', width: 140 },
    { title: t('admin.distributorAccountStatus'), dataIndex: 'accountStatus', key: 'accountStatus', width: 100, render: (s?: string) => {
      const map: Record<string, { color: string; text: string }> = { 
        active: { color: 'green', text: t('admin.distributorActive') }, 
        disabled: { color: 'red', text: t('admin.distributorDisabled') } 
      }
      const cfg = map[s || 'active'] || map['active']
      return <Tag color={cfg.color}>{cfg.text}</Tag>
    } },
         { title: t('common.actions'), key: 'actions', width: 280, render: (_: unknown, record: Distributor) => (
       <Space style={{ justifyContent: 'flex-end' }}>
         <Button 
           size="small" 
           icon={<EditOutlined />} 
           onClick={() => { setEditingDistributor(record); distributorForm.setFieldsValue(record); setDistributorModalOpen(true) }}
           title={t('admin.editTooltip')}
         />
         <Button 
           size="small" 
           icon={record.accountStatus === 'active' ? <StopOutlined /> : <CheckCircleOutlined />}
           type={record.accountStatus === 'active' ? 'default' : 'primary'}
           onClick={() => handleToggleDistributorStatus(record)}
           title={record.accountStatus === 'active' ? t('admin.disableAccountTooltip') : t('admin.enableAccountTooltip')}
         />
                   <Button 
            size="small" 
            icon={<KeyOutlined />} 
            onClick={() => handleResetPassword(record)}
            title={t('admin.resetPasswordTooltip')}
          />
          <Button 
           danger 
           size="small" 
           icon={<DeleteOutlined />} 
           onClick={() => handleDeleteDistributor(record)}
           title={t('admin.deleteTooltip')}
         />
       </Space>
     )}
  ]

  // 工地筛选选项
  const siteManagerOptions = useMemo(() => {
    const set = new Set<string>()
    sites.forEach(s => { if (s.manager) set.add(s.manager) })
    return Array.from(set).map(v => ({ value: v, label: v }))
  }, [sites])

  // 工地筛选后的数据
  const filteredSites = useMemo(() => {
    return sites.filter(s => {
      if (siteStatusFilters.length > 0 && !siteStatusFilters.includes(s.status || 'active')) return false
      if (siteManagerFilters.length > 0 && (!s.manager || !siteManagerFilters.includes(s.manager))) return false
      if (siteKeyword.trim()) {
        const k = siteKeyword.trim().toLowerCase()
        const text = `${s.name || ''} ${s.address || ''} ${s.code || ''}`.toLowerCase()
        if (!text.includes(k)) return false
      }
      return true
    })
  }, [sites, siteStatusFilters, siteManagerFilters, siteKeyword])

  // 分判商全局筛选后的数据（仅按工地筛选）
  const globallyFilteredDistributors = useMemo(() => {
    return distributors.filter(d => {
      // 全局工地筛选：如果选择了特定工地，只显示与该工地关联的分判商
      if (selectedSiteId && (!d.siteIds || !d.siteIds.includes(selectedSiteId))) return false
      return true
    })
  }, [distributors, selectedSiteId])

  // 分判商筛选后的数据
  const filteredDistributors = useMemo(() => {
    return globallyFilteredDistributors.filter(d => {
      if (distributorStatusFilters.length > 0 && !distributorStatusFilters.includes(d.accountStatus || 'active')) return false
      if (distributorKeyword.trim()) {
        const k = distributorKeyword.trim().toLowerCase()
        const text = `${d.name || ''} ${d.contactName || ''}`.toLowerCase()
        if (!text.includes(k)) return false
      }
      return true
    })
  }, [globallyFilteredDistributors, distributorStatusFilters, distributorKeyword])


  // 批量发送账号密码到Email
  const handleBatchSendEmail = () => {
    if (selectedDistributorIds.length === 0) {
      message.warning(t('admin.pleaseSelectDistributorsToSend'))
      return
    }

    const selectedDistributors = distributors.filter(d => selectedDistributorIds.includes(d.id))
    const hasEmailDistributors = selectedDistributors.filter(d => d.email && d.email.trim())
    const noEmailDistributors = selectedDistributors.filter(d => !d.email || !d.email.trim())

    if (hasEmailDistributors.length === 0) {
      message.warning(t('admin.noEmailDistributors'))
      return
    }

    Modal.confirm({
      title: t('admin.batchSendEmailTitle'),
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>{t('admin.batchSendEmailConfirm')}</p>
          <p style={{ marginTop: '8px', color: '#1890ff' }}>
            {t('admin.willSendTo').replace('{count}', hasEmailDistributors.length.toString())}
          </p>
          {noEmailDistributors.length > 0 && (
            <p style={{ marginTop: '8px', color: '#ff4d4f' }}>
              {t('admin.noEmailWarning').replace('{count}', noEmailDistributors.length.toString())}
            </p>
          )}
        </div>
      ),
      okText: t('admin.confirm'),
      cancelText: t('admin.cancel'),
      onOk: async () => {
        try {
          // 显示加载中
          message.loading({ content: t('common.processing'), key: 'batchSendEmail' })
          
          // 获取系统配置中的登录链接
          const frontendUrl = window.location.origin
          const loginUrl = `${frontendUrl}/login`
          
          // 获取当前语言
          const currentLocale = localStorage.getItem('locale') || 'zh-CN'
          
          // 准备数据
          const distributorsData = hasEmailDistributors.map(d => ({
            email: d.email || '',  // 增加空字符串默认值处理类型错误
            name: d.name,
            username: d.accountUsername || '',
            password: 'Pass@123' // 默认密码，在实际应用中可能需要使用重置密码获取
          }))
          
          // 调用批量发送API
          const result = await apiService.batchSendDistributorAccountEmails({
            distributors: distributorsData,
            loginUrl: loginUrl,
            language: currentLocale
          })
          
          // 处理结果
          if (result.success) {
            message.success({ 
              content: t('admin.batchSendEmailSuccess').replace('{count}', result.results?.success.toString() || '0'), 
              key: 'batchSendEmail' 
            })
            
            if (result.results?.failed > 0) {
              message.warning(t('common.someEmailsFailed').replace('{count}', result.results?.failed.toString() || '0'))
            }
            
            if (noEmailDistributors.length > 0) {
              message.warning(t('admin.noEmailSkipped').replace('{count}', noEmailDistributors.length.toString()))
            }
          } else {
            message.error({ content: result.message, key: 'batchSendEmail' })
          }
        } catch (error) {
          console.error('发送失败:', error)
          message.error({ 
            content: t('common.operationFailed') + ': ' + (error.message || t('common.unknownError')),
            key: 'batchSendEmail'
          })
        }
      }
    })
  }

  // 批量发送账号密码到WhatsApp
  const handleBatchSendWhatsApp = () => {
    if (selectedDistributorIds.length === 0) {
      message.warning(t('admin.pleaseSelectDistributorsToSend'))
      return
    }

    const selectedDistributors = distributors.filter(d => selectedDistributorIds.includes(d.id))
    const hasWhatsAppDistributors = selectedDistributors.filter(d => d.whatsapp && d.whatsapp.trim())
    const noWhatsAppDistributors = selectedDistributors.filter(d => !d.whatsapp || !d.whatsapp.trim())

    if (hasWhatsAppDistributors.length === 0) {
      message.warning(t('admin.noWhatsAppDistributors'))
      return
    }

    Modal.confirm({
      title: t('admin.batchSendWhatsAppTitle'),
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>{t('admin.batchSendWhatsAppConfirm')}</p>
          <p style={{ marginTop: '8px', color: '#1890ff' }}>
            {t('admin.willSendTo').replace('{count}', hasWhatsAppDistributors.length.toString())}
          </p>
          {noWhatsAppDistributors.length > 0 && (
            <p style={{ marginTop: '8px', color: '#ff4d4f' }}>
              {t('admin.noWhatsAppWarning').replace('{count}', noWhatsAppDistributors.length.toString())}
            </p>
          )}
        </div>
      ),
      okText: t('admin.confirm'),
      cancelText: t('admin.cancel'),
      onOk: () => {
        // TODO: 调用后端API批量发送WhatsApp
        message.success(t('admin.batchSendWhatsAppSuccess').replace('{count}', hasWhatsAppDistributors.length.toString()))
        if (noWhatsAppDistributors.length > 0) {
          message.warning(t('admin.noWhatsAppSkipped').replace('{count}', noWhatsAppDistributors.length.toString()))
        }
      }
    })
  }

  // 工地表单提交
  const onSiteSubmit = async () => {
    try {
    const v = await siteForm.validateFields()
      
    if (editingSite) {
        // 编辑工地 - 调用后端API
        const siteData = {
          name: v.name,
          address: v.address,
          code: editingSite?.code, // 编辑时保持原有编号
          manager: v.manager,
          phone: v.phone,
          status: v.status || 'active',
          distributorIds: v.distributorIds || []
        }
        
        const updatedSite = await apiService.updateSite(editingSite.id, siteData)
        
        // 转换后端返回的状态格式
        const transformedUpdatedSite = {
          ...updatedSite,
          status: transformSiteStatus(updatedSite.status)
        }
        
        // 更新本地状态
        setSites(prev => prev.map(s => s.id === editingSite.id ? transformedUpdatedSite : s))
        
        // 刷新全局工地筛选器
        await refreshSites()
        
      message.success(t('admin.siteUpdated'))
    } else {
        // 新增工地 - 调用后端API
        const siteData = {
          name: v.name,
          address: v.address,
          // 不传递code字段，让后端自动生成
          manager: v.manager,
          phone: v.phone,
          status: v.status || 'active',
          distributorIds: v.distributorIds || []
        }
        
        const newSite = await apiService.createSite(siteData)
        // 确保返回的site数据包含必需的字段，并转换状态格式
        const siteWithDefaults = {
          ...newSite,
          code: newSite.code || `SITE_${Date.now()}` // 如果没有code，生成一个默认值
        }
        
        // 转换后端返回的状态格式
        const transformedNewSite = {
          ...siteWithDefaults,
          status: transformSiteStatus(siteWithDefaults.status)
        }
        
        setSites(prev => [transformedNewSite, ...prev])
        
        // 刷新全局工地筛选器
        await refreshSites()
        
      message.success(t('admin.siteAdded'))
    }
      
    setSiteModalOpen(false)
    setEditingSite(null)
    siteForm.resetFields()
    } catch (error: unknown) {
      console.error('Failed to submit site:', error)
      
      const err = error as { statusCode?: number; message?: string }
      if (err.statusCode === 400) {
        message.error('输入数据有误，请检查表单')
      } else if (err.statusCode === 409) {
        message.error('工地名称或代码已存在，请使用其他名称或代码')
      } else if (err.statusCode === 403) {
        message.error('权限不足，无法创建工地')
      } else {
        message.error('创建工地失败，请重试')
      }
    }
  }

  // 分判商表单提交
  const onDistributorSubmit = async () => {
    try {
      const v = await distributorForm.validateFields()
      
      if (editingDistributor) {
        // 编辑分判商 - 调用后端API
        const updateData = {
          name: v.name,
          contactName: v.contactName,
          phone: v.phone,
          email: v.email,
          whatsapp: v.whatsapp,
          siteIds: v.siteIds || [],
          username: v.accountUsername // 添加用户名更新
        }
        
        console.log('准备更新分判商，数据:', updateData)
        
        const updatedDistributor = await apiService.updateDistributor(editingDistributor.id, updateData)
        console.log('分判商更新成功:', updatedDistributor)
        
        // 转换数据格式以匹配前端期望
        const transformedDistributor = {
          id: updatedDistributor.id,
          distributorId: updatedDistributor.distributorId,
          name: updatedDistributor.name,
          contactName: updatedDistributor.contactName,
          phone: updatedDistributor.phone,
          email: updatedDistributor.email,
          whatsapp: updatedDistributor.whatsapp,
          accountUsername: updatedDistributor.user?.username || updatedDistributor.name,
          accountStatus: (updatedDistributor.user?.status === 'ACTIVE' ? 'active' : 'disabled') as 'active' | 'disabled',
          siteIds: updatedDistributor.siteIds || [],
          userId: updatedDistributor.userId
        }
        
        setDistributors(prev => prev.map(d => d.id === editingDistributor.id ? transformedDistributor : d))
        message.success(t('admin.distributorUpdated'))
      } else {
        // 新增分判商 - 调用后端API
        const defaultPwd = v.defaultPassword && String(v.defaultPassword).trim() ? String(v.defaultPassword).trim() : 'Pass@123'
        
        const distributorData = {
          name: v.name,
          contactName: v.contactName,
          phone: v.phone,
          email: v.email,
          whatsapp: v.whatsapp,
          username: v.accountUsername || v.name.toLowerCase().replace(/\s+/g, ''),
          password: defaultPwd,
          siteIds: v.siteIds || []
        }
        
        console.log('准备创建分判商，数据:', distributorData)
        
        const newDistributor = await apiService.createDistributor(distributorData)
        console.log('分判商创建成功:', newDistributor)
        
        // 转换数据格式以匹配前端期望
        const transformedDistributor = {
          id: newDistributor.id,
          distributorId: newDistributor.distributorId,
          name: newDistributor.name,
          contactName: newDistributor.contactName,
          phone: newDistributor.phone,
          email: newDistributor.email,
          whatsapp: newDistributor.whatsapp,
          accountUsername: newDistributor.user?.username || newDistributor.name,
          accountStatus: (newDistributor.user?.status === 'ACTIVE' ? 'active' : 'disabled') as 'active' | 'disabled',
          siteIds: newDistributor.siteIds || []
        }
        
        setDistributors(prev => [transformedDistributor, ...prev])
        
        // 显示发送方式选择对话框
        showSendMethodModal(transformedDistributor, defaultPwd)
        message.success(t('admin.distributorAdded'))
      }
      
      setDistributorModalOpen(false)
      setEditingDistributor(null)
      distributorForm.resetFields()
    } catch (error: unknown) {
      console.error('Failed to submit distributor:', error)
      
      // 更详细的错误处理
      const err = error as { statusCode?: number; message?: string }
      let errorMessage = '创建分判商失败，请重试'
      
      if (err.statusCode === 400) {
        errorMessage = err.message || '输入数据有误，请检查表单'
      } else if (err.statusCode === 409) {
        errorMessage = '用户名已存在，请使用其他用户名'
      } else if (err.statusCode === 403) {
        errorMessage = '权限不足，无法创建分判商'
      } else if (err.statusCode === 422) {
        errorMessage = '数据验证失败，请检查输入信息'
      } else if (err.statusCode === 500) {
        errorMessage = '服务器内部错误，请稍后重试'
      } else if (err.message) {
        errorMessage = err.message
      }
      
      message.error(errorMessage)
    }
  }

  // 门卫表单提交
  const onGuardSubmit = async () => {
    try {
      const v = await guardForm.validateFields()
      
      if (editingGuard) {
        // 编辑门卫 - 调用后端API
        const updateData = {
          name: v.name,
          phone: v.phone,
          email: v.email,
          whatsapp: v.whatsapp,
          siteId: v.siteId,
          username: v.accountUsername // 添加用户名更新
        }
        
        console.log('准备更新门卫，数据:', updateData)
        
        const updatedGuard = await apiService.updateGuard(editingGuard.id, updateData)
        console.log('门卫更新成功:', updatedGuard)
        
        // 转换数据格式以匹配前端期望
        const transformedGuard = {
          id: updatedGuard.id,
          guardId: updatedGuard.guardId,
          name: updatedGuard.name,
          phone: updatedGuard.phone,
          email: updatedGuard.email,
          whatsapp: updatedGuard.whatsapp,
          siteId: updatedGuard.siteId,
          accountUsername: updatedGuard.user?.username || updatedGuard.guardId,
          accountStatus: (updatedGuard.user?.status === 'ACTIVE' ? 'active' : 'disabled') as 'active' | 'disabled',
          createdAt: updatedGuard.createdAt,
          updatedAt: updatedGuard.updatedAt,
          userId: editingGuard?.userId
        }
        
        setGuards(prev => prev.map(g => g.id === editingGuard.id ? transformedGuard : g))
        message.success(t('admin.guardUpdated'))
      } else {
        // 新增门卫 - 调用后端API
        const defaultPwd = v.defaultPassword && String(v.defaultPassword).trim() ? String(v.defaultPassword).trim() : 'Pass@123'
        
        const guardData = {
          name: v.name,
          siteId: v.siteId,
          phone: v.phone,
          email: v.email,
          whatsapp: v.whatsapp,
          username: v.accountUsername || v.name.toLowerCase().replace(/\s+/g, ''),
          password: defaultPwd
        }
        
        const newGuard = await apiService.createGuard(guardData)
        
        // 转换数据格式以匹配前端期望
        const transformedGuard = {
          id: newGuard.id,
          guardId: newGuard.guardId,
          name: newGuard.name,
          siteId: newGuard.siteId,
          phone: newGuard.phone,
          email: newGuard.email,
          whatsapp: newGuard.whatsapp,
          accountUsername: newGuard.user?.username || newGuard.guardId,
          accountStatus: (newGuard.user?.status === 'ACTIVE' ? 'active' : 'disabled') as 'active' | 'disabled',
          createdAt: newGuard.createdAt,
          updatedAt: newGuard.updatedAt
        }
        
        setGuards(prev => [transformedGuard, ...prev])
        
        message.success(t('admin.guardAddedSuccess').replace('{username}', v.accountUsername || newGuard.guardId).replace('{password}', defaultPwd))
      }
      
      setGuardModalOpen(false)
      setEditingGuard(null)
      guardForm.resetFields()
    } catch (error: unknown) {
      console.error('Failed to submit guard:', error)
      
      const err = error as { statusCode?: number; message?: string }
      if (err.statusCode === 400) {
        message.error('输入数据有误，请检查表单')
      } else if (err.statusCode === 409) {
        message.error('门卫ID或用户名已存在，请使用其他ID或用户名')
      } else if (err.statusCode === 403) {
        message.error('权限不足，无法操作门卫')
      } else if (err.statusCode === 404) {
        message.error('门卫不存在')
      } else {
        const errorMessage = editingGuard ? '更新门卫失败，请重试' : '创建门卫失败，请重试'
        message.error(errorMessage)
      }
    }
  }

  // Excel导入导出处理函数
  const handleSiteExport = (exportAll: boolean = true) => {
    const dataToExport = exportAll ? sites : sites.filter(site => selectedSiteIds.includes(site.id))
    
    if (!exportAll && selectedSiteIds.length === 0) {
      message.warning(t('admin.pleaseSelectSitesToExport'))
      return
    }
    
    exportSitesToExcel(dataToExport, distributors)
    message.success(t('admin.sitesExported').replace('{count}', dataToExport.length.toString()))
  }


  const handleDistributorExport = (exportAll: boolean = true) => {
    const dataToExport = exportAll ? distributors : distributors.filter(distributor => selectedDistributorIds.includes(distributor.id))
    
    if (!exportAll && selectedDistributorIds.length === 0) {
      message.warning(t('admin.pleaseSelectDistributorsToExport'))
      return
    }
    
    exportDistributorsToExcel(dataToExport, sites)
    message.success(t('admin.distributorsExported').replace('{count}', dataToExport.length.toString()))
  }

  // 显示分判商导出选择对话框
  const showDistributorExportOptions = () => {
    const currentSiteName = selectedSiteId ? sites.find(s => s.id === selectedSiteId)?.name : null
    const currentSiteDistributors = selectedSiteId ? distributors.filter(d => d.siteIds && d.siteIds.includes(selectedSiteId)) : []
    const currentSiteCount = currentSiteDistributors.length
    const allDistributorsCount = distributors.length

    Modal.confirm({
      title: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{t('admin.exportDistributorsTitle')}</span>
          <Button 
            type="text" 
            size="small" 
            icon={<CloseOutlined />} 
            onClick={() => Modal.destroyAll()}
            style={{ marginRight: -8 }}
          />
        </div>
      ),
      icon: <DownloadOutlined style={{ color: '#1890ff' }} />,
      content: (
        <div>
          <p style={{ marginBottom: '16px', fontSize: '14px' }}>
            {t('admin.exportDistributorsDescription')}
          </p>
          
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px',
            marginBottom: '16px'
          }}>
            {/* 导出当前全局工地选择的分判商数据 */}
            <div 
              style={{ 
                padding: '12px 16px', 
                border: '1px solid #d9d9d9', 
                borderRadius: '6px',
                cursor: 'pointer',
                background: '#fafafa',
                transition: 'all 0.2s'
              }}
              onClick={() => {
                Modal.destroyAll()
                handleExportCurrentSiteDistributors()
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
                  {t('admin.exportCurrentSiteDistributors')}
                </span>
                <span style={{ 
                  background: '#1890ff', 
                  color: 'white', 
                  padding: '2px 8px', 
                  borderRadius: '12px',
                  fontSize: '12px'
                }}>
                  {currentSiteCount}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {currentSiteName ? 
                  t('admin.exportCurrentSiteDistributorsDescription').replace('{siteName}', currentSiteName) :
                  t('admin.noSiteSelected')
                }
              </div>
            </div>

            {/* 导出所有分判商的数据 */}
            <div 
              style={{ 
                padding: '12px 16px', 
                border: '1px solid #d9d9d9', 
                borderRadius: '6px',
                cursor: 'pointer',
                background: '#fafafa',
                transition: 'all 0.2s'
              }}
              onClick={() => {
                Modal.destroyAll()
                handleExportAllDistributors()
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
                  {t('admin.exportAllDistributors')}
                </span>
                <span style={{ 
                  background: '#52c41a', 
                  color: 'white', 
                  padding: '2px 8px', 
                  borderRadius: '12px',
                  fontSize: '12px'
                }}>
                  {allDistributorsCount}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {t('admin.exportAllDistributorsDescription')}
              </div>
            </div>
          </div>

          <div style={{ 
            padding: '8px 12px', 
            background: '#e6f7ff', 
            border: '1px solid #91d5ff', 
            borderRadius: '4px',
            fontSize: '12px',
            color: '#666'
          }}>
            💡 {t('admin.exportDistributorsTip')}
          </div>
        </div>
      ),
      okText: t('admin.exportCurrentSiteDistributors'),
      cancelText: t('admin.exportAllDistributors'),
      onOk: () => {
        handleExportCurrentSiteDistributors()
      },
      onCancel: () => {
        handleExportAllDistributors()
      },
      width: 500
    })
  }

  // 导出当前全局工地选择的分判商数据
  const handleExportCurrentSiteDistributors = () => {
    if (!selectedSiteId) {
      message.warning(t('admin.noSiteSelectedForExport'))
      return
    }

    const currentSiteDistributors = distributors.filter(d => d.siteIds && d.siteIds.includes(selectedSiteId))
    exportDistributorsToExcel(currentSiteDistributors, sites)
    message.success(t('admin.currentSiteDistributorsExported').replace('{count}', currentSiteDistributors.length.toString()))
  }

  // 导出所有分判商的数据
  const handleExportAllDistributors = () => {
    exportDistributorsToExcel(distributors, sites)
    message.success(t('admin.allDistributorsExported').replace('{count}', distributors.length.toString()))
  }

  const handleSiteImport = async (file: File) => {
    try {
      const { sites: importedSites, errors } = await readSiteExcelFile(file)
      
      if (errors.length > 0) {
        message.error(t('admin.importFailed').replace('{errors}', errors.join('; ')))
        return
      }
      
      if (importedSites.length === 0) {
        message.warning('Excel文件中没有找到有效的工地数据，请检查文件格式和内容')
        return
      }
      
      // 显示导入确认对话框
      Modal.confirm({
        title: t('admin.siteImportConfirm'),
        content: (
          <div>
            <p>{t('admin.importConfirmMessage').replace('{count}', importedSites.length.toString())}</p>
            <p style={{ color: '#1890ff', marginTop: '8px' }}>
              {t('admin.siteImportRulesMessage')}
            </p>
            <p style={{ color: '#666', fontSize: '12px', marginTop: '8px' }}>
              {t('admin.importRulesMessage')}
            </p>
            {errors.length > 0 && (
              <div style={{ 
                marginTop: '12px', 
                padding: '8px', 
                background: '#fff7e6', 
                border: '1px solid #ffd591', 
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                <div style={{ color: '#fa8c16', fontWeight: 'bold', marginBottom: '4px' }}>
                  ⚠️ {t('admin.importWarnings')}:
                </div>
                {errors.slice(0, 3).map((error, index) => (
                  <div key={index} style={{ color: '#666', marginBottom: '2px' }}>
                    {error}
                  </div>
                ))}
                {errors.length > 3 && (
                  <div style={{ color: '#999', fontStyle: 'italic' }}>
                    ... 还有 {errors.length - 3} 个警告
                  </div>
                )}
              </div>
            )}
          </div>
        ),
        onOk: async () => {
          await processSiteImport(importedSites)
        }
      })
    } catch (error) {
      message.error(t('admin.importFailed').replace('{errors}', (error as Error).message))
    }
  }

  // 处理工地导入
  const processSiteImport = async (importedSites: Record<string, unknown>[]) => {
    try {
      setLoading(true)
      
      let successCount = 0
      let skipCount = 0
      const errors: string[] = []

      for (const siteData of importedSites) {
        try {
          // 准备导入数据
          const importData = {
            name: String(siteData.name || ''),
            address: String(siteData.address || ''),
            code: String(siteData.code || '').trim(),
            manager: String(siteData.manager || ''),
            phone: String(siteData.phone || ''),
            status: (siteData.status as 'active' | 'inactive' | 'suspended') || 'active'
          }

          // 如果没有编号，不发送code字段，让后端自动生成
          if (!importData.code) {
            delete importData.code
          }

          try {
            // 先尝试创建，如果编号已存在会返回409错误
            const newSite = await apiService.createSite(importData)
            
            // 转换数据格式以匹配前端期望
            const transformedSite = {
              id: newSite.id,
              code: newSite.code,
              name: newSite.name,
              address: newSite.address,
              manager: newSite.manager,
              phone: newSite.phone,
              status: transformSiteStatus(newSite.status),
              distributorIds: newSite.distributorIds || []
            }
            
            setSites(prev => [transformedSite, ...prev])
            successCount++
          } catch (createError: unknown) {
            const error = createError as { statusCode?: number; message?: string }
            if (error.statusCode === 409) {
              // 编号已存在，跳过
              skipCount++
              console.log(`跳过重复的工地: ${siteData.name} (编号: ${importData.code || '自动生成'})`)
            } else {
              // 其他错误
              errors.push(`${siteData.name}: ${error.message || '创建失败'}`)
            }
          }
        } catch (error: unknown) {
          const err = error as { message?: string }
          errors.push(`${siteData.name}: ${err.message || '处理失败'}`)
        }
      }

      // 刷新全局工地筛选器
      await refreshSites()

      // 显示导入结果弹窗
      showImportResultModal(successCount, skipCount, errors, 'site')
    } catch (error) {
      console.error('Site import processing failed:', error)
      message.error(t('admin.importFailed').replace('{errors}', (error as Error).message))
    } finally {
      setLoading(false)
    }
  }

  const handleDistributorImport = async (file: File) => {
    try {
      const { distributors: importedDistributors, errors } = await readDistributorExcelFile(file, sites)
      
      if (errors.length > 0) {
        message.error(t('admin.importFailed').replace('{errors}', errors.join('; ')))
        return
      }
      
      if (importedDistributors.length === 0) {
        message.warning('Excel文件中没有找到有效的分判商数据，请检查文件格式和内容')
        return
      }
      
      // 显示导入确认对话框
      // 调试翻译键
      console.log('🔍 翻译键调试信息:');
      console.log('当前语言:', locale);
      console.log('翻译对象类型:', typeof messages);
      console.log('翻译对象键:', Object.keys(messages || {}));
      console.log('admin对象存在:', !!messages?.admin);
      console.log('admin对象键:', messages?.admin ? Object.keys(messages.admin) : '无');
      console.log('admin对象键数量:', messages?.admin ? Object.keys(messages.admin).length : 0);
      console.log('查找导入相关键:');
      const adminKeys = messages?.admin ? Object.keys(messages.admin) : [];
      const importKeys = adminKeys.filter(key => key.includes('import') || key.includes('Import'));
      console.log('包含import的键:', importKeys);
      console.log('admin.distributorImportConfirm:', t('admin.distributorImportConfirm'));
      console.log('admin.importConfirmMessage:', t('admin.importConfirmMessage'));
      console.log('admin.importDefaultSiteMessage:', t('admin.importDefaultSiteMessage'));
      console.log('admin.importRulesMessage:', t('admin.importRulesMessage'));
      console.log('admin.noSiteSelected:', t('admin.noSiteSelected'));
      
      // 检查其他翻译键是否工作
      console.log('其他翻译键测试:');
      console.log('common.save:', t('common.save'));
      console.log('common.cancel:', t('common.cancel'));
      
      Modal.confirm({
        title: t('admin.distributorImportConfirm'),
        content: (
          <div>
            <p>{t('admin.importConfirmMessage').replace('{count}', importedDistributors.length.toString())}</p>
            <p style={{ color: '#1890ff', marginTop: '8px' }}>
              {t('admin.importDefaultSiteMessage').replace('{siteName}', selectedSiteId ? sites.find(s => s.id === selectedSiteId)?.name || '' : t('admin.noSiteSelected'))}
            </p>
            <p style={{ color: '#666', fontSize: '12px', marginTop: '8px' }}>
              {t('admin.importRulesMessage')}
            </p>
            {errors.length > 0 && (
              <div style={{ 
                marginTop: '12px', 
                padding: '8px', 
                background: '#fff7e6', 
                border: '1px solid #ffd591', 
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                <div style={{ color: '#fa8c16', fontWeight: 'bold', marginBottom: '4px' }}>
                  ⚠️ {t('admin.importWarnings')}:
                </div>
                {errors.slice(0, 3).map((error, index) => (
                  <div key={index} style={{ color: '#666', marginBottom: '2px' }}>
                    {error}
                  </div>
                ))}
                {errors.length > 3 && (
                  <div style={{ color: '#999', fontStyle: 'italic' }}>
                    ... 还有 {errors.length - 3} 个警告
                  </div>
                )}
              </div>
            )}
          </div>
        ),
        onOk: async () => {
          await processDistributorImport(importedDistributors)
        }
      })
    } catch (error) {
      message.error(t('admin.importFailed').replace('{errors}', (error as Error).message))
    }
  }

  // 处理分判商导入
  const processDistributorImport = async (importedDistributors: Record<string, unknown>[]) => {
    try {
      setLoading(true)
      
      let successCount = 0
      let skipCount = 0
      const errors: string[] = []

      for (const distributorData of importedDistributors) {
        try {
          // 准备导入数据
          const importData = {
            name: String(distributorData.name || ''),
            contactName: String(distributorData.contactName || ''),
            phone: String(distributorData.phone || ''),
            email: String(distributorData.email || ''),
            whatsapp: String(distributorData.whatsapp || ''),
            username: String(distributorData.accountUsername || String(distributorData.name || '').toLowerCase().replace(/\s+/g, '')),
            password: 'Pass@123', // 默认密码
            siteIds: Array.isArray(distributorData.siteIds) && distributorData.siteIds.length > 0 
              ? distributorData.siteIds 
              : (selectedSiteId ? [selectedSiteId] : [])
          }

          // 检查用户名是否已存在（通过API调用）
          try {
            // 先尝试创建，如果用户名已存在会返回409错误
            const newDistributor = await apiService.createDistributor(importData)
            
            // 转换数据格式以匹配前端期望
            const transformedDistributor = {
              id: newDistributor.id,
              distributorId: newDistributor.distributorId,
              name: newDistributor.name,
              contactName: newDistributor.contactName,
              phone: newDistributor.phone,
              email: newDistributor.email,
              whatsapp: newDistributor.whatsapp,
              accountUsername: newDistributor.user?.username || newDistributor.name,
              accountStatus: (newDistributor.user?.status === 'ACTIVE' ? 'active' : 'disabled') as 'active' | 'disabled',
              siteIds: newDistributor.siteIds || []
            }
            
            setDistributors(prev => [transformedDistributor, ...prev])
            successCount++
          } catch (createError: unknown) {
            const error = createError as { statusCode?: number; message?: string }
            if (error.statusCode === 409) {
              // 用户名已存在，跳过
              skipCount++
              console.log(`跳过重复的分判商: ${distributorData.name} (用户名: ${importData.username})`)
            } else {
              // 其他错误
              errors.push(`${distributorData.name}: ${error.message || '创建失败'}`)
            }
          }
        } catch (error: unknown) {
          const err = error as { message?: string }
          errors.push(`${distributorData.name}: ${err.message || '处理失败'}`)
        }
      }

      // 刷新全局工地筛选器
      await refreshSites()

      // 显示导入结果弹窗
      showImportResultModal(successCount, skipCount, errors, 'distributor')
    } catch (error) {
      console.error('Import processing failed:', error)
      message.error(t('admin.importFailed').replace('{errors}', (error as Error).message))
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadSiteTemplate = () => {
    generateSiteImportTemplate()
    message.success(t('admin.siteTemplateDownloaded'))
  }

  const handleDownloadDistributorTemplate = () => {
    generateDistributorImportTemplate()
    message.success(t('admin.distributorTemplateDownloaded'))
  }

  // 门卫导入导出相关函数
  const handleGuardImport = async (file: File) => {
    try {
      // 使用当前全局选择的工地作为默认工地
      const { guards: importedGuards, errors } = await readGuardExcelFile(file, selectedSiteId)
      
      if (errors.length > 0) {
        message.error(t('admin.importFailed').replace('{errors}', errors.join('; ')))
        return
      }
      
      if (importedGuards.length === 0) {
        message.warning('Excel文件中没有找到有效的保安数据，请检查文件格式和内容')
        return
      }

      // 显示导入确认对话框
      Modal.confirm({
        title: t('admin.guardImportConfirm'),
        content: (
          <div>
            <p>{t('admin.guardImportConfirmMessage').replace('{count}', importedGuards.length.toString())}</p>
            <p style={{ color: '#1890ff', marginTop: '8px' }}>
              {t('admin.guardImportDefaultSiteMessage').replace('{siteName}', selectedSiteId ? sites.find(s => s.id === selectedSiteId)?.code || '' : t('admin.noSiteSelected'))}
            </p>
            <p style={{ color: '#666', fontSize: '12px', marginTop: '8px' }}>
              {t('admin.guardImportRulesMessage')}
            </p>
            {errors.length > 0 && (
              <div style={{ 
                marginTop: '12px', 
                padding: '8px', 
                background: '#fff7e6', 
                border: '1px solid #ffd591', 
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                <div style={{ color: '#fa8c16', fontWeight: 'bold', marginBottom: '4px' }}>
                  ⚠️ {t('admin.importWarnings')}:
                </div>
                {errors.slice(0, 3).map((error, index) => (
                  <div key={index} style={{ color: '#666', marginBottom: '2px' }}>
                    {error}
                  </div>
                ))}
                {errors.length > 3 && (
                  <div style={{ color: '#999', fontStyle: 'italic' }}>
                    ... 还有 {errors.length - 3} 个警告
                  </div>
                )}
              </div>
            )}
          </div>
        ),
        onOk: async () => {
          await processGuardImport(importedGuards)
        }
      })
    } catch (error) {
      message.error(t('admin.importFailed').replace('{errors}', '文件读取失败'))
    }
  }

  // 处理门卫导入
  const processGuardImport = async (importedGuards: Record<string, unknown>[]) => {
    try {
      setLoading(true)
      
      let successCount = 0
      let skipCount = 0
      const errors: string[] = []
      
      // 获取现有的门卫数据，用于检查唯一性
      const existingGuards = await apiService.getAllGuards()
      const existingGuardIds = new Set(existingGuards.map(g => g.guardId))
      const existingUsernames = new Set(existingGuards.map(g => g.user?.username).filter(Boolean))

      for (const guardData of importedGuards) {
        try {
          // 生成门卫编号（如果没有提供）
          let guardId = String(guardData.guardId || '').trim()
          if (!guardId) {
            let counter = 1
            do {
              guardId = `G${String(successCount + skipCount + errors.length + counter).padStart(3, '0')}`
              counter++
            } while (existingGuardIds.has(guardId))
            existingGuardIds.add(guardId) // 添加到已使用列表
          }
          
          // 生成账号（如果没有提供）
          let username = String(guardData.accountUsername || '').trim()
          if (!username) {
            let counter = 1
            do {
              username = `guard${String(successCount + skipCount + errors.length + counter).padStart(3, '0')}`
              counter++
            } while (existingUsernames.has(username))
            existingUsernames.add(username) // 添加到已使用列表
          }
          
          // 准备导入数据
          const importData = {
            name: String(guardData.name || ''),
            siteId: guardData.siteId || (selectedSiteId ? sites.find(s => s.id === selectedSiteId)?.code : '') || '',
            phone: String(guardData.phone || ''),
            email: String(guardData.email || ''),
            whatsapp: String(guardData.whatsapp || ''),
            guardId: guardId,
            username: username,
            password: '123456' // 默认密码
          }

          // 检查用户名是否已存在（通过API调用）
          try {
            // 先尝试创建，如果用户名已存在会返回409错误
            const newGuard = await apiService.createGuard(importData)
            
            // 转换数据格式以匹配前端期望
            const transformedGuard = {
              id: newGuard.id,
              guardId: newGuard.guardId,
              name: newGuard.name,
              siteId: newGuard.siteId,
              phone: newGuard.phone,
              email: newGuard.email,
              whatsapp: newGuard.whatsapp,
              accountUsername: newGuard.user?.username || newGuard.name,
              accountStatus: (newGuard.user?.status === 'ACTIVE' ? 'active' : 'disabled') as 'active' | 'disabled',
              status: newGuard.status,
              createdAt: newGuard.createdAt,
              updatedAt: newGuard.updatedAt,
              site: newGuard.site
            }
            
            setGuards(prev => [transformedGuard, ...prev])
            successCount++
          } catch (createError: unknown) {
            const error = createError as { statusCode?: number; message?: string }
            if (error.statusCode === 409) {
              // 用户名已存在，跳过
              skipCount++
              console.log(`跳过重复的门卫: ${guardData.name} (用户名: ${importData.username})`)
            } else {
              // 其他错误
              errors.push(`${guardData.name}: ${error.message || '创建失败'}`)
            }
          }
        } catch (error: unknown) {
          const err = error as { message?: string }
          errors.push(`${guardData.name}: ${err.message || '处理失败'}`)
        }
      }

      // 刷新全局工地筛选器
      await refreshSites()

      // 显示导入结果弹窗
      showImportResultModal(successCount, skipCount, errors, 'guard')
    } catch (error) {
      console.error('Import processing failed:', error)
      message.error(t('admin.importFailed').replace('{errors}', (error as Error).message))
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadGuardTemplate = () => {
    generateGuardImportTemplate()
    message.success(t('admin.guardTemplateDownloaded'))
  }

  // 显示导入结果弹窗
  const showImportResultModal = (successCount: number, skipCount: number, errors: string[], type: 'distributor' | 'guard' | 'site' = 'distributor') => {
    const totalCount = successCount + skipCount + errors.length
    const title = type === 'guard' ? t('admin.guardImportResultTitle') : 
                  type === 'site' ? t('admin.siteImportResultTitle') : 
                  t('admin.importResultTitle')
    
    Modal.info({
      title: title,
      width: 600,
      content: (
        <div style={{ marginTop: '16px' }}>
          {/* 总体统计 */}
          <div style={{ 
            background: '#f6ffed', 
            border: '1px solid #b7eb8f', 
            borderRadius: '6px', 
            padding: '16px', 
            marginBottom: '16px' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '16px', marginRight: '8px' }} />
              <span style={{ fontWeight: 'bold', fontSize: '16px' }}>
                {t('admin.importCompleted')}
              </span>
            </div>
            <div style={{ color: '#666', fontSize: '14px' }}>
              {t('admin.importTotalProcessed').replace('{total}', totalCount.toString())}
            </div>
          </div>

          {/* 详细统计 */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ 
              flex: 1, 
              textAlign: 'center', 
              padding: '12px', 
              background: successCount > 0 ? '#f6ffed' : '#f5f5f5',
              border: `1px solid ${successCount > 0 ? '#b7eb8f' : '#d9d9d9'}`,
              borderRadius: '6px'
            }}>
              <div style={{ 
                color: successCount > 0 ? '#52c41a' : '#999', 
                fontSize: '24px', 
                fontWeight: 'bold',
                marginBottom: '4px'
              }}>
                {successCount}
              </div>
              <div style={{ color: '#666', fontSize: '12px' }}>
                {t('admin.importSuccessCount')}
              </div>
            </div>
            
            <div style={{ 
              flex: 1, 
              textAlign: 'center', 
              padding: '12px', 
              background: skipCount > 0 ? '#fff7e6' : '#f5f5f5',
              border: `1px solid ${skipCount > 0 ? '#ffd591' : '#d9d9d9'}`,
              borderRadius: '6px'
            }}>
              <div style={{ 
                color: skipCount > 0 ? '#fa8c16' : '#999', 
                fontSize: '24px', 
                fontWeight: 'bold',
                marginBottom: '4px'
              }}>
                {skipCount}
              </div>
              <div style={{ color: '#666', fontSize: '12px' }}>
                {t('admin.importSkipCount')}
              </div>
            </div>
            
            <div style={{ 
              flex: 1, 
              textAlign: 'center', 
              padding: '12px', 
              background: errors.length > 0 ? '#fff2f0' : '#f5f5f5',
              border: `1px solid ${errors.length > 0 ? '#ffccc7' : '#d9d9d9'}`,
              borderRadius: '6px'
            }}>
              <div style={{ 
                color: errors.length > 0 ? '#ff4d4f' : '#999', 
                fontSize: '24px', 
                fontWeight: 'bold',
                marginBottom: '4px'
              }}>
                {errors.length}
              </div>
              <div style={{ color: '#666', fontSize: '12px' }}>
                {t('admin.importErrorCount')}
              </div>
            </div>
          </div>

          {/* 错误详情 */}
          {errors.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ 
                fontWeight: 'bold', 
                marginBottom: '8px', 
                color: '#ff4d4f',
                display: 'flex',
                alignItems: 'center'
              }}>
                <ExclamationCircleOutlined style={{ marginRight: '6px' }} />
                {t('admin.importErrorDetails')}
              </div>
              <div style={{ 
                background: '#fff2f0', 
                border: '1px solid #ffccc7', 
                borderRadius: '6px', 
                padding: '12px',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                {errors.map((error, index) => (
                  <div key={index} style={{ 
                    marginBottom: '4px', 
                    fontSize: '12px',
                    color: '#666',
                    fontFamily: 'monospace'
                  }}>
                    {index + 1}. {error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 提示信息 */}
          <div style={{ 
            marginTop: '16px', 
            padding: '12px', 
            background: '#e6f7ff', 
            border: '1px solid #91d5ff', 
            borderRadius: '6px',
            fontSize: '12px',
            color: '#666'
          }}>
            <div style={{ marginBottom: '4px' }}>
              💡 {t('admin.importTips')}
            </div>
            <div>• {t('admin.importTip1')}</div>
            <div>• {t('admin.importTip2')}</div>
            <div>• {t('admin.importTip3')}</div>
          </div>
        </div>
      ),
      okText: t('admin.confirm'),
      onOk: () => {
        // 可以在这里添加额外的处理逻辑
      }
    })
  }

  const handleGuardExport = (exportAll: boolean = true) => {
    const dataToExport = exportAll ? guards : guards.filter(guard => selectedGuardIds.includes(guard.id))
    
    if (!exportAll && selectedGuardIds.length === 0) {
      message.warning(t('admin.pleaseSelectGuardsToExport'))
      return
    }
    
    exportGuardsToExcel(dataToExport, sites)
    message.success(t('admin.guardsExported').replace('{count}', dataToExport.length.toString()))
  }

  // 显示门卫导出选择对话框
  const showGuardExportOptions = () => {
    const currentSiteName = selectedSiteId ? sites.find(s => s.id === selectedSiteId)?.name : null
    const currentSiteGuards = selectedSiteId ? guards.filter(g => g.siteId === selectedSiteId) : []
    const currentSiteCount = currentSiteGuards.length
    const allGuardsCount = guards.length

    Modal.confirm({
      title: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{t('admin.exportGuardsTitle')}</span>
          <Button 
            type="text" 
            size="small" 
            icon={<CloseOutlined />} 
            onClick={() => Modal.destroyAll()}
            style={{ marginRight: -8 }}
          />
        </div>
      ),
      icon: <DownloadOutlined style={{ color: '#1890ff' }} />,
      content: (
        <div>
          <p style={{ marginBottom: '16px', fontSize: '14px' }}>
            {t('admin.exportGuardsDescription')}
          </p>
          
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px',
            marginBottom: '16px'
          }}>
            {/* 导出当前全局工地选择的门卫数据 */}
            <div 
              style={{ 
                padding: '12px 16px', 
                border: '1px solid #d9d9d9', 
                borderRadius: '6px',
                cursor: 'pointer',
                background: '#fafafa',
                transition: 'all 0.2s'
              }}
              onClick={async () => {
                Modal.destroyAll()
                await handleExportCurrentSiteGuards()
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
                  {t('admin.exportCurrentSiteGuards')}
                </span>
                <span style={{ 
                  background: '#1890ff', 
                  color: 'white', 
                  padding: '2px 8px', 
                  borderRadius: '12px',
                  fontSize: '12px'
                }}>
                  {currentSiteCount}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {currentSiteName ? 
                  t('admin.exportCurrentSiteGuardsDescription').replace('{siteName}', currentSiteName) :
                  t('admin.noSiteSelected')
                }
              </div>
            </div>

            {/* 导出所有门卫的数据 */}
            <div 
              style={{ 
                padding: '12px 16px', 
                border: '1px solid #d9d9d9', 
                borderRadius: '6px',
                cursor: 'pointer',
                background: '#fafafa',
                transition: 'all 0.2s'
              }}
              onClick={async () => {
                Modal.destroyAll()
                await handleExportAllGuards()
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
                  {t('admin.exportAllGuards')}
                </span>
                <span style={{ 
                  background: '#52c41a', 
                  color: 'white', 
                  padding: '2px 8px', 
                  borderRadius: '12px',
                  fontSize: '12px'
                }}>
                  {allGuardsCount}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {t('admin.exportAllGuardsDescription')}
              </div>
            </div>
          </div>

          <div style={{ 
            padding: '8px 12px', 
            background: '#e6f7ff', 
            border: '1px solid #91d5ff', 
            borderRadius: '4px',
            fontSize: '12px',
            color: '#666'
          }}>
            💡 {t('admin.exportGuardsTip')}
          </div>
        </div>
      ),
      okText: t('admin.exportCurrentSiteGuards'),
      cancelText: t('admin.exportAllGuards'),
      onOk: async () => {
        await handleExportCurrentSiteGuards()
      },
      onCancel: async () => {
        await handleExportAllGuards()
      },
      width: 500
    })
  }

  // 导出当前全局工地选择的门卫数据
  const handleExportCurrentSiteGuards = async () => {
    if (!selectedSiteId) {
      message.warning(t('admin.noSiteSelectedForExport'))
      return
    }

    try {
      const currentSiteGuards = await apiService.getGuardsBySite(selectedSiteId)
      exportGuardsToExcel(currentSiteGuards, sites)
      message.success(t('admin.currentSiteGuardsExported').replace('{count}', currentSiteGuards.length.toString()))
    } catch (error) {
      message.error(t('admin.exportFailed'))
    }
  }

  // 导出所有门卫的数据
  const handleExportAllGuards = async () => {
    try {
      const allGuards = await apiService.getAllGuards()
      exportGuardsToExcel(allGuards, sites)
      message.success(t('admin.allGuardsExported').replace('{count}', allGuards.length.toString()))
    } catch (error) {
      message.error(t('admin.exportFailed'))
    }
  }

  // 门卫管理相关函数
  const handleToggleGuardAccountStatus = (record: Guard) => {
    const newStatus = record.accountStatus === 'active' ? 'disabled' : 'active'
    
    const statusTitle = newStatus === 'active' ? t('admin.enableGuardTitle') : t('admin.disableGuardTitle')
    const statusConfirm = newStatus === 'active' ? t('admin.enableGuardConfirm') : t('admin.disableGuardConfirm')
    const statusSuccess = newStatus === 'active' ? t('admin.enableGuardSuccess') : t('admin.disableGuardSuccess')
    
    Modal.confirm({
      title: statusTitle,
      content: (
        <div>
          <p>{statusConfirm.replace('{name}', record.name)}</p>
          {newStatus === 'disabled' && (
            <p style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '8px' }}>
              {t('admin.disableAccountWarning')}
            </p>
          )}
        </div>
      ),
      okText: t('admin.confirm'),
      cancelText: t('admin.cancel'),
      onOk: async () => {
        try {
          const result = await apiService.toggleGuardStatus(record.id)
          console.log('门卫状态切换成功:', result)
          
          // 更新本地状态
        setGuards(prev => prev.map(g => 
          g.id === record.id ? { ...g, accountStatus: newStatus } : g
        ))
          
        message.success(statusSuccess.replace('{name}', record.name))
        } catch (error: unknown) {
          console.error('切换门卫状态失败:', error)
          let errorMessage = '切换状态失败'
          if (error && typeof error === 'object' && 'response' in error) {
            const apiError = error as { response?: { data?: { message?: string } } }
            if (apiError.response?.data?.message) {
              errorMessage = apiError.response.data.message
            }
          } else if (error && typeof error === 'object' && 'message' in error) {
            const simpleError = error as { message: string }
            errorMessage = simpleError.message
          }
          message.error(errorMessage)
        }
      }
    })
  }

  // 删除分判商
  const handleDeleteDistributor = (record: Distributor) => {
    Modal.confirm({
      title: t('admin.deleteDistributorTitle'),
      content: t('admin.deleteDistributorConfirm').replace('{name}', record.name),
      okText: t('admin.confirm'),
      cancelText: t('admin.cancel'),
      okType: 'danger',
      onOk: async () => {
        try {
          const result = await apiService.deleteDistributor(record.id)
          console.log('分判商删除成功:', result)
          
          // 从本地状态中移除
          setDistributors(prev => prev.filter(d => d.id !== record.id))
          message.success(t('admin.distributorDeleted').replace('{name}', record.name))
        } catch (error: unknown) {
          console.error('删除分判商失败:', error)
          let errorMessage = '删除分判商失败'
          if (error && typeof error === 'object' && 'response' in error) {
            const apiError = error as { response?: { data?: { message?: string } } }
            if (apiError.response?.data?.message) {
              errorMessage = apiError.response.data.message
            }
          } else if (error && typeof error === 'object' && 'message' in error) {
            const simpleError = error as { message: string }
            errorMessage = simpleError.message
          }
          message.error(errorMessage)
        }
      }
    })
  }

  // 删除门卫
  const handleDeleteGuard = (record: Guard) => {
    Modal.confirm({
      title: t('admin.deleteGuardTitle'),
      content: t('admin.deleteGuardConfirm').replace('{name}', record.name),
      okText: t('admin.confirm'),
      cancelText: t('admin.cancel'),
      okType: 'danger',
      onOk: async () => {
        try {
          const result = await apiService.deleteGuard(record.id)
          console.log('门卫删除成功:', result)
          
          // 从本地状态中移除
          setGuards(prev => prev.filter(g => g.id !== record.id))
          message.success(t('admin.guardDeleted').replace('{name}', record.name))
        } catch (error: unknown) {
          console.error('删除门卫失败:', error)
          let errorMessage = '删除门卫失败'
          if (error && typeof error === 'object' && 'response' in error) {
            const apiError = error as { response?: { data?: { message?: string } } }
            if (apiError.response?.data?.message) {
              errorMessage = apiError.response.data.message
            }
          } else if (error && typeof error === 'object' && 'message' in error) {
            const simpleError = error as { message: string }
            errorMessage = simpleError.message
          }
          message.error(errorMessage)
        }
      }
    })
  }

  // 重置门卫密码
  const handleResetGuardPassword = (record: Guard) => {
    Modal.confirm({
      title: t('admin.resetGuardPasswordTitle'),
      content: t('admin.resetGuardPasswordConfirm').replace('{name}', record.name),
      okText: t('admin.confirm'),
      cancelText: t('admin.cancel'),
      onOk: async () => {
        try {
          const result = await apiService.resetGuardPassword(record.id)
          console.log('门卫密码重置成功:', result)
          
          // 显示成功消息，包含新密码信息
          Modal.success({
            title: t('admin.resetGuardPasswordSuccess'),
            content: (
              <div>
                <p>{t('admin.resetGuardPasswordSuccessMessage').replace('{name}', result.guardName)}</p>
                <p><strong>{t('admin.newPassword')}: {result.newPassword}</strong></p>
                <p style={{ color: '#ff4d4f', fontSize: '12px' }}>{t('admin.passwordSecurityTip')}</p>
              </div>
            ),
            width: 400
          })
        } catch (error: unknown) {
          console.error('重置门卫密码失败:', error)
          let errorMessage = '重置密码失败'
          if (error && typeof error === 'object' && 'response' in error) {
            const apiError = error as { response?: { data?: { message?: string } } }
            if (apiError.response?.data?.message) {
              errorMessage = apiError.response.data.message
            }
          } else if (error && typeof error === 'object' && 'message' in error) {
            const simpleError = error as { message: string }
            errorMessage = simpleError.message
          }
          message.error(errorMessage)
        }
      }
    })
  }

  // 门卫列定义
  const guardColumns = [
    { title: t('admin.guardId'), dataIndex: 'guardId', key: 'guardId', width: 120, sorter: (a: Guard, b: Guard) => a.guardId.localeCompare(b.guardId) },
    { title: t('admin.guardName'), dataIndex: 'name', key: 'name', width: 120, sorter: (a: Guard, b: Guard) => a.name.localeCompare(b.name) },
    { title: t('admin.guardSite'), dataIndex: 'siteId', key: 'siteId', width: 150, 
      render: (siteId: string) => {
        const site = sites.find(s => s.id === siteId)
        return site ? site.name : '-'
      },
      sorter: (a: Guard, b: Guard) => {
        const siteA = sites.find(s => s.id === a.siteId)
        const siteB = sites.find(s => s.id === b.siteId)
        return (siteA?.name || '').localeCompare(siteB?.name || '')
      }
    },
    { title: t('admin.guardPhone'), dataIndex: 'phone', key: 'phone', width: 130, sorter: (a: Guard, b: Guard) => a.phone.localeCompare(b.phone) },
    { title: t('admin.guardEmail'), dataIndex: 'email', key: 'email', width: 180, sorter: (a: Guard, b: Guard) => (a.email || '').localeCompare(b.email || '') },
    { title: t('admin.guardWhatsApp'), dataIndex: 'whatsapp', key: 'whatsapp', width: 130, sorter: (a: Guard, b: Guard) => (a.whatsapp || '').localeCompare(b.whatsapp || '') },
    { title: t('admin.guardAccount'), dataIndex: 'accountUsername', key: 'accountUsername', width: 120, sorter: (a: Guard, b: Guard) => (a.accountUsername || '').localeCompare(b.accountUsername || '') },
    { title: t('admin.guardAccountStatus'), dataIndex: 'accountStatus', key: 'accountStatus', width: 100,
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? t('admin.distributorActive') : t('admin.distributorDisabled')}
        </Tag>
      ),
      sorter: (a: Guard, b: Guard) => (a.accountStatus || '').localeCompare(b.accountStatus || '')
    },
    { title: t('common.actions'), key: 'actions', width: 200, render: (_: unknown, record: Guard) => (
      <Space style={{ justifyContent: 'flex-end' }}>
        <Button 
          size="small" 
          icon={<EditOutlined />} 
          onClick={() => { setEditingGuard(record); guardForm.setFieldsValue(record); setGuardModalOpen(true) }}
          title={t('admin.editTooltip')}
        />
        <Button 
          size="small" 
          icon={<KeyOutlined />}
          onClick={() => handleResetGuardPassword(record)}
          title={t('admin.resetPasswordTooltip')}
        />
        <Button 
          size="small" 
          icon={record.accountStatus === 'active' ? <StopOutlined /> : <CheckCircleOutlined />}
          type={record.accountStatus === 'active' ? 'default' : 'primary'}
          onClick={() => handleToggleGuardAccountStatus(record)}
          title={record.accountStatus === 'active' ? t('admin.disableAccountTooltip') : t('admin.enableAccountTooltip')}
        />
        <Button 
          danger 
          size="small" 
          icon={<DeleteOutlined />} 
          onClick={() => handleDeleteGuard(record)}
          title={t('admin.deleteTooltip')}
        />
      </Space>
    )}
  ]

  // 门卫全局筛选后的数据（仅按工地筛选）
  const globallyFilteredGuards = useMemo(() => {
    return guards.filter(guard => {
      // 全局工地筛选：如果选择了特定工地，只显示该工地的门卫
      if (selectedSiteId && guard.siteId !== selectedSiteId) return false
      return true
    })
  }, [guards, selectedSiteId])

  // 门卫筛选逻辑
  const filteredGuards = useMemo(() => {
    return globallyFilteredGuards.filter(guard => {
      // 状态筛选
      if (guardStatusFilters.length > 0 && !guardStatusFilters.includes(guard.accountStatus || 'active')) return false
      
      // 关键词筛选
      const matchesKeyword = !guardKeyword.trim() || 
        guard.guardId.toLowerCase().includes(guardKeyword.toLowerCase()) ||
        guard.name.toLowerCase().includes(guardKeyword.toLowerCase()) ||
        guard.phone.includes(guardKeyword)
      
      return matchesKeyword
    })
  }, [globallyFilteredGuards, guardStatusFilters, guardKeyword])

  // 监听筛选数据变化，更新分页总数
  useEffect(() => {
    setSitePagination(prev => ({ ...prev, total: filteredSites.length, current: 1 }))
  }, [filteredSites])

  useEffect(() => {
    setDistributorPagination(prev => ({ ...prev, total: filteredDistributors.length, current: 1 }))
  }, [filteredDistributors])

  useEffect(() => {
    setGuardPagination(prev => ({ ...prev, total: filteredGuards.length, current: 1 }))
  }, [filteredGuards])

  // 工地管理标签页内容
  const siteManagementTab = (
    <Card>
      <Row gutter={12} style={{ marginBottom: 12 }}>
        <Col span={5}>
          <Input placeholder={t('admin.siteKeywordPlaceholder')} value={siteKeyword} onChange={e => setSiteKeyword(e.target.value)} allowClear />
        </Col>
        <Col span={5}>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder={t('admin.statusFilterPlaceholder')}
            value={siteStatusFilters}
            onChange={setSiteStatusFilters}
            options={[{ value: 'active', label: t('admin.active') }, { value: 'suspended', label: t('admin.suspended') }, { value: 'inactive', label: t('admin.inactive') }]}
            allowClear
          />
        </Col>
        <Col span={5}>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder={t('admin.managerFilterPlaceholder')}
            value={siteManagerFilters}
            onChange={setSiteManagerFilters}
            options={siteManagerOptions}
            allowClear
          />
        </Col>
        <Col span={9}>
           <Space wrap>
             <Button size="small" icon={<DownloadOutlined />} onClick={handleDownloadSiteTemplate}>{t('admin.downloadTemplate')}</Button>
             <Upload
               accept=".xlsx,.xls"
               showUploadList={false}
               beforeUpload={(file) => {
                 handleSiteImport(file)
                 return false
               }}
             >
               <Button size="small" icon={<UploadOutlined />}>{t('admin.importExcel')}</Button>
             </Upload>
             <Button 
               size="small"
               icon={<DownloadOutlined />} 
               onClick={selectedSiteIds.length === 0 ? () => handleSiteExport(true) : () => handleSiteExport(false)}
             >
               {selectedSiteIds.length === 0 ? t('admin.exportAll') : `${t('admin.exportSelected')}(${selectedSiteIds.length})`}
             </Button>
           </Space>
         </Col>
      </Row>
      
      {/* 筛选结果统计 */}
      {!loading && (siteStatusFilters.length > 0 || siteManagerFilters.length > 0 || siteKeyword.trim() || selectedSiteIds.length > 0) && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f5f5f5', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#666', fontSize: '14px' }}>
            {t('admin.filterResults').replace('{count}', filteredSites.length.toString())}
            {sites.length !== filteredSites.length && (
              <span style={{ marginLeft: 8, color: '#999' }}>
                {t('admin.fromTotalRecords').replace('{total}', sites.length.toString())}
              </span>
            )}
          </span>
                 <Space>
           {(siteStatusFilters.length > 0 || siteManagerFilters.length > 0 || siteKeyword.trim()) && (
             <Button 
               size="small" 
               onClick={() => {
                 setSiteStatusFilters([])
                 setSiteManagerFilters([])
                 setSiteKeyword('')
               }}
             >
               {t('admin.clearFilter')}
             </Button>
           )}
           {selectedSiteIds.length > 0 && (
             <Button 
               size="small" 
               onClick={() => setSelectedSiteIds([])}
             >
               {t('admin.clearSelection')}({selectedSiteIds.length})
             </Button>
           )}
         </Space>
        </div>
      )}
      
      <Table 
        rowKey="id" 
        columns={siteColumns} 
        dataSource={filteredSites} 
        loading={loading}
        pagination={{
          current: sitePagination.current,
          pageSize: sitePagination.pageSize,
          total: sitePagination.total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          pageSizeOptions: ['10', '20', '50', '100'],
          onChange: handleSitePaginationChange,
          onShowSizeChange: handleSitePaginationChange
        }}
        rowSelection={{
          selectedRowKeys: selectedSiteIds,
          onChange: (selectedRowKeys) => setSelectedSiteIds(selectedRowKeys as string[]),
          getCheckboxProps: (record) => ({
            name: record.name,
          }),
        }}
      />
    </Card>
  )

  // 分判商管理标签页内容
  const distributorManagementTab = (
    <Card>
      <Row gutter={12} style={{ marginBottom: 12 }}>
        <Col span={8}>
          <Input placeholder={t('admin.distributorKeywordPlaceholder')} value={distributorKeyword} onChange={e => setDistributorKeyword(e.target.value)} allowClear />
        </Col>
        <Col span={8}>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder={t('admin.accountStatusFilterPlaceholder')}
            value={distributorStatusFilters}
            onChange={setDistributorStatusFilters}
            options={[{ value: 'active', label: t('admin.active') }, { value: 'disabled', label: t('admin.disabled') }]}
            allowClear
          />
        </Col>
        <Col span={8}>
           <Space wrap>
             <Button size="small" icon={<DownloadOutlined />} onClick={handleDownloadDistributorTemplate}>{t('admin.downloadTemplate')}</Button>
             <Upload
               accept=".xlsx,.xls"
               showUploadList={false}
               beforeUpload={(file) => {
                 handleDistributorImport(file)
                 return false
               }}
             >
               <Button size="small" icon={<UploadOutlined />}>{t('admin.importExcel')}</Button>
             </Upload>
             <Button 
               size="small"
               icon={<DownloadOutlined />} 
               onClick={selectedDistributorIds.length === 0 ? showDistributorExportOptions : () => handleDistributorExport(false)}
             >
               {selectedDistributorIds.length === 0 ? t('admin.exportAll') : `${t('admin.exportSelected')}(${selectedDistributorIds.length})`}
             </Button>
           </Space>
         </Col>
      </Row>
      
      {/* 筛选结果统计 */}
      {!loading && (distributorStatusFilters.length > 0 || distributorKeyword.trim() || selectedDistributorIds.length > 0) && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f5f5f5', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ color: '#666', fontSize: '14px' }}>
              {t('admin.filterResults').replace('{count}', filteredDistributors.length.toString())}
              {globallyFilteredDistributors.length !== filteredDistributors.length && (
                <span style={{ marginLeft: 8, color: '#999' }}>
                  {t('admin.fromTotalRecords').replace('{total}', globallyFilteredDistributors.length.toString())}
                </span>
              )}
            </span>
          
          {/* 批量发送按钮 */}
          {selectedDistributorIds.length > 0 && (
            <Space>
              <Button 
                size="small" 
                type="primary"
                icon={<SendOutlined />}
                onClick={() => handleBatchSendEmail()}
                title={t('admin.batchSendEmailTitle')}
              >
                {t('admin.batchSendEmail')}
              </Button>
              <Button 
                size="small" 
                type="primary"
                icon={<SendOutlined />}
                onClick={() => handleBatchSendWhatsApp()}
                title={t('admin.batchSendWhatsAppTitle')}
              >
                {t('admin.batchSendWhatsApp')}
              </Button>
            </Space>
          )}
        </div>
        
        <Space>
          {(distributorStatusFilters.length > 0 || distributorKeyword.trim()) && (
            <Button 
              size="small" 
              onClick={() => {
                setDistributorStatusFilters([])
                setDistributorKeyword('')
              }}
            >
              {t('admin.clearFilter')}
            </Button>
          )}
          {selectedDistributorIds.length > 0 && (
            <Button 
              size="small" 
              onClick={() => setSelectedDistributorIds([])}
            >
              {t('admin.clearSelection')}({selectedDistributorIds.length})
            </Button>
          )}
        </Space>
        </div>
      )}
      
             <Table 
         rowKey="id" 
         columns={distributorColumns} 
         dataSource={filteredDistributors} 
         loading={loading}
         pagination={{
           current: distributorPagination.current,
           pageSize: distributorPagination.pageSize,
           total: distributorPagination.total,
           showSizeChanger: true,
           showQuickJumper: true,
           showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
           pageSizeOptions: ['10', '20', '50', '100'],
           onChange: handleDistributorPaginationChange,
           onShowSizeChange: handleDistributorPaginationChange
         }}
         rowSelection={{
           selectedRowKeys: selectedDistributorIds,
           onChange: (selectedRowKeys) => setSelectedDistributorIds(selectedRowKeys as string[]),
           getCheckboxProps: (record) => ({
             name: record.name,
           }),
         }}
       />
    </Card>
  )

  // 门卫管理标签页内容
  const guardManagementTab = (
    <Card>
      <Row gutter={12} style={{ marginBottom: 12 }}>
        <Col span={8}>
          <Input placeholder={t('admin.guardKeywordPlaceholder')} value={guardKeyword} onChange={e => setGuardKeyword(e.target.value)} allowClear />
        </Col>
        <Col span={8}>
          <Select
            mode="multiple"
            placeholder={t('admin.guardStatusFilter')}
            value={guardStatusFilters}
            onChange={setGuardStatusFilters}
            style={{ width: '100%' }}
            allowClear
          >
            <Select.Option value="active">{t('admin.distributorActive')}</Select.Option>
            <Select.Option value="disabled">{t('admin.distributorDisabled')}</Select.Option>
          </Select>
        </Col>
        <Col span={8}>
          <Space wrap>
            <Button size="small" icon={<DownloadOutlined />} onClick={handleDownloadGuardTemplate}>{t('admin.downloadTemplate')}</Button>
            <Upload
              accept=".xlsx,.xls"
              showUploadList={false}
              beforeUpload={(file) => {
                handleGuardImport(file)
                return false
              }}
            >
              <Button size="small" icon={<UploadOutlined />}>{t('admin.importExcel')}</Button>
            </Upload>
            <Button 
              size="small" 
              icon={<DownloadOutlined />} 
              onClick={selectedGuardIds.length === 0 ? showGuardExportOptions : () => handleGuardExport(false)}
            >
              {selectedGuardIds.length === 0 ? t('admin.exportAll') : `${t('admin.exportSelected')}(${selectedGuardIds.length})`}
            </Button>
          </Space>
        </Col>
      </Row>
      
      {/* 筛选结果统计 */}
      {!loading && (guardStatusFilters.length > 0 || guardKeyword.trim() || selectedGuardIds.length > 0) && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f5f5f5', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ color: '#666', fontSize: '14px' }}>
              {t('admin.filterResults').replace('{count}', filteredGuards.length.toString())}
              {globallyFilteredGuards.length !== filteredGuards.length && (
                <span style={{ marginLeft: 8, color: '#999' }}>
                  {t('admin.fromTotalRecords').replace('{total}', globallyFilteredGuards.length.toString())}
                </span>
              )}
            </span>
          </div>
        
        <Space>
          {(guardStatusFilters.length > 0 || guardKeyword.trim()) && (
            <Button 
              size="small" 
              onClick={() => {
                setGuardStatusFilters([])
                setGuardKeyword('')
              }}
            >
              {t('admin.clearFilter')}
            </Button>
          )}
          {selectedGuardIds.length > 0 && (
            <Button 
              size="small" 
              onClick={() => setSelectedGuardIds([])}
            >
              {t('admin.clearSelection')}({selectedGuardIds.length})
            </Button>
          )}
        </Space>
        </div>
      )}
      
      <Table 
        rowKey="id" 
        columns={guardColumns} 
        dataSource={filteredGuards} 
        loading={loading}
        pagination={{
          current: guardPagination.current,
          pageSize: guardPagination.pageSize,
          total: guardPagination.total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          pageSizeOptions: ['10', '20', '50', '100'],
          onChange: handleGuardPaginationChange,
          onShowSizeChange: handleGuardPaginationChange
        }}
        rowSelection={{
          selectedRowKeys: selectedGuardIds,
          onChange: (selectedRowKeys) => setSelectedGuardIds(selectedRowKeys as string[]),
          getCheckboxProps: (record) => ({
            name: record.name,
          }),
        }}
      />
    </Card>
  )

  return (
    <div style={{ padding: '0 24px 24px 24px' }}>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'distributors',
            label: (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
                <TeamOutlined style={{ color: '#52c41a', fontSize: '16px' }} />
                <span style={{ fontSize: '15px', fontWeight: 500 }}>{t('admin.distributorManagement')}（{filteredDistributors.length}）</span>
              </div>
            ),
            children: distributorManagementTab
          },
          {
            key: 'guards',
            label: (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
                <KeyOutlined style={{ color: '#fa8c16', fontSize: '16px' }} />
                <span style={{ fontSize: '15px', fontWeight: 500 }}>{t('admin.guardManagement')}（{filteredGuards.length}）</span>
              </div>
            ),
            children: guardManagementTab
          },
          {
            key: 'sites',
            label: (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
                <HomeOutlined style={{ color: '#1890ff', fontSize: '16px' }} />
                <span style={{ fontSize: '15px', fontWeight: 500 }}>{t('admin.siteManagement')}（{filteredSites.length}）</span>
              </div>
            ),
            children: siteManagementTab
          }
        ]}
        tabBarExtraContent={
          <Space>
            <Button 
              icon={<DownloadOutlined />} 
              onClick={loadData}
              loading={loading}
              title={t('common.refresh')}
            >
              {t('common.refresh')}
            </Button>
            {activeTab === 'sites' ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingSite(null); siteForm.resetFields(); setSiteModalOpen(true) }}>
                {t('admin.addSite')}
              </Button>
            ) : activeTab === 'guards' ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingGuard(null); guardForm.resetFields(); setGuardModalOpen(true) }}>
                {t('admin.addGuard')}
              </Button>
            ) : (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { 
                setEditingDistributor(null); 
                distributorForm.resetFields(); 
                // 设置默认工地为当前全局筛选选择的工地
                if (selectedSiteId) {
                  distributorForm.setFieldsValue({ siteIds: [selectedSiteId] });
                }
                setDistributorModalOpen(true) 
              }}>
                {t('admin.addDistributor')}
              </Button>
            )}
          </Space>
        }
        style={{ 
          background: '#fff', 
          padding: '16px 24px 0 24px', 
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
        }}
        tabBarStyle={{
          margin: 0,
          borderBottom: '1px solid #f0f0f0'
        }}
      />

      {/* 工地管理模态框 */}
      <Modal title={editingSite ? t('admin.editSite') : t('admin.addSite')} open={siteModalOpen} onCancel={() => { setSiteModalOpen(false); setEditingSite(null) }} onOk={onSiteSubmit} destroyOnClose>
        <Form form={siteForm} layout="vertical">
          <Form.Item name="name" label={t('admin.nameLabel')} rules={[{ required: true, message: t('form.required') }]}>
            <Input placeholder={t('admin.siteNamePlaceholder')} />
          </Form.Item>
          <Form.Item name="address" label={t('admin.addressLabel')} rules={[{ required: true, message: t('form.required') }]}>
            <Input placeholder={t('admin.addressPlaceholder')} />
          </Form.Item>
          <Form.Item name="manager" label={t('admin.managerLabel')}>
            <Input placeholder={t('admin.managerPlaceholder')} />
          </Form.Item>
          <Form.Item name="phone" label={t('admin.phoneLabel')}>
            <Input placeholder={t('admin.phonePlaceholder')} />
          </Form.Item>
          <Form.Item name="status" label={t('admin.statusLabel')} initialValue={'active'}>
            <Select options={[{ value: 'active', label: t('admin.active') }, { value: 'suspended', label: t('admin.suspended') }, { value: 'inactive', label: t('admin.inactive') }]} />
          </Form.Item>
          <Form.Item name="distributorIds" label={t('admin.distributorIdsLabel')}>
            <Select 
              mode="multiple" 
              placeholder={t('admin.distributorSelectPlaceholder')} 
              options={distributors.map(d => ({ value: d.id, label: d.name }))} 
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 分判商管理模态框 */}
      <Modal title={editingDistributor ? t('admin.editDistributor') : t('admin.addDistributor')} open={distributorModalOpen} onCancel={() => { setDistributorModalOpen(false); setEditingDistributor(null) }} onOk={onDistributorSubmit} destroyOnClose>
        <Form form={distributorForm} layout="vertical">
          <Form.Item name="name" label={t('admin.nameLabel')} rules={[{ required: true, message: t('form.required') }]}>
            <Input placeholder={t('admin.distributorNamePlaceholder')} />
          </Form.Item>
          <Form.Item name="contactName" label={t('admin.contactLabel')}>
            <Input placeholder={t('admin.contactPlaceholder')} />
          </Form.Item>
          <Form.Item name="siteIds" label={t('admin.siteIdsLabel')} rules={[{ required: true, message: t('form.required') }]}>
            <Select 
              mode="multiple" 
              placeholder={t('admin.siteMultiSelectPlaceholder')} 
              options={sites.map(s => ({ value: s.id, label: s.name }))} 
            />
          </Form.Item>
          <Form.Item name="phone" label={t('admin.phoneLabel')}>
            <Input placeholder={t('admin.phonePlaceholder')} />
          </Form.Item>
          <Form.Item name="email" label={t('admin.emailLabel')}>
            <Input placeholder={t('admin.emailPlaceholder')} />
          </Form.Item>
          <Form.Item name="whatsapp" label={t('admin.whatsAppLabel')}>
            <Input placeholder={t('admin.whatsAppPlaceholder')} />
          </Form.Item>
          <Form.Item name="accountUsername" label={t('admin.accountLabel')}>
            <Input placeholder={t('admin.accountPlaceholder')} />
          </Form.Item>
          {!editingDistributor && (
            <Form.Item name="defaultPassword" label={t('admin.defaultPasswordLabel')} tooltip={t('admin.defaultPasswordTooltip')} initialValue="Pass@123">
              <Input placeholder={t('admin.defaultPasswordPlaceholder')} disabled value="Pass@123" />
            </Form.Item>
          )}
          <Form.Item name="accountStatus" label={t('admin.accountStatusLabel')} initialValue={'active'}>
            <Select options={[{ value: 'active', label: t('admin.active') }, { value: 'disabled', label: t('admin.disabled') }]} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 门卫管理模态框 */}
      <Modal title={editingGuard ? t('admin.editGuard') : t('admin.addGuard')} open={guardModalOpen} onCancel={() => { setGuardModalOpen(false); setEditingGuard(null) }} onOk={onGuardSubmit} destroyOnClose>
        <Form form={guardForm} layout="vertical">
          <Form.Item name="name" label={t('admin.nameLabel')} rules={[{ required: true, message: t('form.required') }]}>
            <Input placeholder={t('admin.guardNamePlaceholder')} />
          </Form.Item>
          <Form.Item name="siteId" label={t('admin.siteIdLabel')} rules={[{ required: true, message: t('form.required') }]}>
            <Select 
              placeholder={t('admin.siteSelectPlaceholder')} 
              options={sites.map(s => ({ value: s.id, label: s.name }))} 
            />
          </Form.Item>
          <Form.Item name="phone" label={t('admin.phoneLabel')} rules={[{ required: true, message: t('form.required') }]}>
            <Input placeholder={t('admin.phonePlaceholder')} />
          </Form.Item>
          <Form.Item name="email" label={t('admin.emailLabel')}>
            <Input placeholder={t('admin.emailPlaceholder')} />
          </Form.Item>
          <Form.Item name="whatsapp" label={t('admin.whatsAppLabel')}>
            <Input placeholder={t('admin.whatsAppPlaceholder')} />
          </Form.Item>
          <Form.Item name="accountUsername" label={t('admin.accountLabel')}>
            <Input placeholder={t('admin.accountPlaceholder')} />
          </Form.Item>
          {!editingGuard && (
            <Form.Item name="defaultPassword" label={t('admin.initialPasswordLabel')} tooltip={t('admin.initialPasswordTooltip')}>
              <Input.Password placeholder={t('admin.initialPasswordPlaceholder')} />
            </Form.Item>
          )}
          <Form.Item name="accountStatus" label={t('admin.accountStatusLabel')} initialValue={'active'}>
            <Select options={[{ value: 'active', label: t('admin.active') }, { value: 'disabled', label: t('admin.disabled') }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default AdminSites


