import React, { useMemo, useState, useEffect } from 'react'
import { Card, Table, Button, Space, Modal, Form, Input, Select, Tag, message, Row, Col, Tabs, Upload } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined, ExclamationCircleOutlined, CheckCircleOutlined, StopOutlined, HomeOutlined, TeamOutlined, UploadOutlined, DownloadOutlined, SendOutlined, CloseOutlined } from '@ant-design/icons'
import { Site, Distributor, Guard } from '../types/worker'
import { mockSites, mockDistributors, mockGuards } from '../data/mockData'
import { 
  exportSitesToExcel, 
  exportDistributorsToExcel, 
  readSiteExcelFile, 
  readDistributorExcelFile,
  generateSiteImportTemplate,
  generateDistributorImportTemplate
} from '../utils/excelUtils'
import { useLocale } from '../contexts/LocaleContext'
import { apiService } from '../services/api'

const AdminSites: React.FC = () => {
  const { t } = useLocale()
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
  const [distributorSiteFilters, setDistributorSiteFilters] = useState<string[]>([])
  const [distributorKeyword, setDistributorKeyword] = useState<string>('')

  // 门卫筛选状态
  const [guardSiteFilters, setGuardSiteFilters] = useState<string[]>([])
  const [guardKeyword, setGuardKeyword] = useState<string>('')
  
  // 标签页状态
  const [activeTab, setActiveTab] = useState<string>('distributors')
  
  // 加载状态
  const [loading, setLoading] = useState(false)

  // 加载数据
  useEffect(() => {
    loadData()
  }, [])

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
        status: site.status || 'active',
        distributorIds: site.distributorIds || []
      }))
      
      const transformedDistributors = distributorsData.map(distributor => ({
        id: distributor.id,
        name: distributor.name,
        contactName: distributor.contactName,
        phone: distributor.phone,
        email: distributor.email,
        whatsapp: distributor.whatsapp,
        accountUsername: distributor.accountUsername,
        accountStatus: (distributor.accountStatus || 'active') as 'active' | 'disabled',
        siteIds: distributor.sites?.map(s => s.id) || []
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
    
    if (!hasEmail && !hasWhatsApp) {
      // 如果没有联系方式，直接显示成功信息
      message.success(t('admin.noContactInfo').replace('{name}', distributor.name).replace('{username}', distributor.accountUsername || '').replace('{password}', password))
      return
    }
    
    if (hasEmail && !hasWhatsApp) {
      // 只有Email，直接发送
      // TODO: 调用后端API发送Email
      message.success(t('admin.sendByEmailSuccess').replace('{name}', distributor.contactName || ''))
      return
    }
    
    if (!hasEmail && hasWhatsApp) {
      // 只有WhatsApp，直接发送
      // TODO: 调用后端API发送WhatsApp
      message.success(t('admin.sendByWhatsAppSuccess').replace('{name}', distributor.contactName || ''))
      return
    }
    
    // 两种方式都有，显示选择对话框
    Modal.confirm({
      title: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{t('admin.selectSendMethod')}</span>
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
          <p style={{ marginTop: '16px', color: '#666' }}>{t('admin.selectSendMethodTip')}</p>
        </div>
      ),
      okText: t('admin.sendByEmail'),
      cancelText: t('admin.sendByWhatsApp'),
      onCancel: () => {
        // TODO: 调用后端API发送WhatsApp
        message.success(t('admin.sendByWhatsAppSuccess').replace('{name}', distributor.contactName || ''))
      },
      onOk: () => {
        // TODO: 调用后端API发送Email
        message.success(t('admin.sendByEmailSuccess').replace('{name}', distributor.contactName || ''))
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
      onOk: () => {
        // TODO: 调用后端API执行重置
        message.success(t('admin.resetPasswordSuccess').replace('{name}', record.name))
      }
    })
  }

  // 切换工地状态
  const handleToggleSiteStatus = (record: Site) => {
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
      onOk: () => {
        setSites(prev => prev.map(s => s.id === record.id ? { ...s, status: newStatus } : s))
        const successMessage = newStatus === 'active' ? t('admin.enableSiteSuccess') : t('admin.disableSiteSuccess')
        message.success(successMessage.replace('{name}', record.name))
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
        </div>
      ),
      okText: t('admin.confirm'),
      cancelText: t('admin.cancel'),
      onOk: () => {
        setDistributors(prev => prev.map(d => d.id === record.id ? { ...d, accountStatus: newStatus } : d))
        const successMessage = newStatus === 'active' ? t('admin.enableDistributorSuccess') : t('admin.disableDistributorSuccess')
        message.success(successMessage.replace('{name}', record.name))
      }
    })
  }

  // 工地表格列定义
  const siteColumns = [
    { title: t('admin.siteId'), dataIndex: 'id', key: 'id', width: 100 },
    { title: t('admin.siteName'), dataIndex: 'name', key: 'name', width: 160 },
    { title: t('admin.siteAddress'), dataIndex: 'address', key: 'address' },
    { title: t('admin.siteManager'), dataIndex: 'manager', key: 'manager', width: 120 },
    { title: t('admin.sitePhone'), dataIndex: 'phone', key: 'phone', width: 140 },
    { title: t('admin.siteStatus'), dataIndex: 'status', key: 'status', width: 100, render: (s?: string) => {
      const map: any = { active: { color: 'green', text: t('admin.siteActive') }, inactive: { color: 'red', text: t('admin.siteInactive') }, suspended: { color: 'orange', text: t('admin.siteSuspended') } }
      const cfg = map[s || 'active']
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
    { title: t('common.actions'), key: 'actions', width: 180, render: (_: any, record: Site) => (
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
          onClick={() => setSites(prev => prev.filter(s => s.id !== record.id))}
          title={t('admin.deleteTooltip')}
        />
      </Space>
    )}
  ]

  // 分判商表格列定义
  const distributorColumns = [
    { title: t('admin.distributorId'), dataIndex: 'id', key: 'id', width: 100 },
    { title: t('admin.distributorName'), dataIndex: 'name', key: 'name', width: 160 },
    { title: t('admin.distributorContact'), dataIndex: 'contactName', key: 'contactName', width: 120 },
    { title: t('admin.distributorPhone'), dataIndex: 'phone', key: 'phone', width: 140 },
    { title: t('admin.distributorEmail'), dataIndex: 'email', key: 'email', width: 200 },
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
      const map: any = { active: { color: 'green', text: t('admin.distributorActive') }, disabled: { color: 'red', text: t('admin.distributorDisabled') } }
      const cfg = map[s || 'active']
      return <Tag color={cfg.color}>{cfg.text}</Tag>
    } },
         { title: t('common.actions'), key: 'actions', width: 280, render: (_: any, record: Distributor) => (
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
           onClick={() => setDistributors(prev => prev.filter(d => d.id !== record.id))}
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

  // 分判商筛选后的数据
  const filteredDistributors = useMemo(() => {
    return distributors.filter(d => {
      if (distributorStatusFilters.length > 0 && !distributorStatusFilters.includes(d.accountStatus || 'active')) return false
      if (distributorSiteFilters.length > 0 && (!d.siteIds || !d.siteIds.some(siteId => distributorSiteFilters.includes(siteId)))) return false
      if (distributorKeyword.trim()) {
        const k = distributorKeyword.trim().toLowerCase()
        const text = `${d.name || ''} ${d.contactName || ''}`.toLowerCase()
        if (!text.includes(k)) return false
      }
      return true
    })
  }, [distributors, distributorStatusFilters, distributorSiteFilters, distributorKeyword])

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
      onOk: () => {
        // TODO: 调用后端API批量发送Email
        message.success(t('admin.batchSendEmailSuccess').replace('{count}', hasEmailDistributors.length.toString()))
        if (noEmailDistributors.length > 0) {
          message.warning(t('admin.noEmailSkipped').replace('{count}', noEmailDistributors.length.toString()))
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
    const v = await siteForm.validateFields()
    if (editingSite) {
      setSites(prev => prev.map(s => s.id === editingSite.id ? { ...editingSite, ...v } : s))
      message.success(t('admin.siteUpdated'))
    } else {
      const newItem: Site = { id: (Date.now()).toString(), code: v.code || '', name: v.name, address: v.address, manager: v.manager, phone: v.phone, status: v.status, distributorIds: v.distributorIds }
      setSites(prev => [newItem, ...prev])
      message.success(t('admin.siteAdded'))
    }
    setSiteModalOpen(false)
    setEditingSite(null)
    siteForm.resetFields()
  }

  // 分判商表单提交
  const onDistributorSubmit = async () => {
    try {
      const v = await distributorForm.validateFields()
      
      if (editingDistributor) {
        // 编辑分判商 - 暂时使用本地更新，后续可以添加编辑API
        setDistributors(prev => prev.map(d => d.id === editingDistributor.id ? { ...editingDistributor, ...v } : d))
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
          siteIds: v.siteIds
        }
        
        const newDistributor = await apiService.createDistributor(distributorData)
        setDistributors(prev => [newDistributor, ...prev])
        
        // 显示发送方式选择对话框
        showSendMethodModal(newDistributor, defaultPwd)
        message.success(t('admin.distributorAdded'))
      }
      
      setDistributorModalOpen(false)
      setEditingDistributor(null)
      distributorForm.resetFields()
    } catch (error: any) {
      console.error('Failed to submit distributor:', error)
      
      if (error.statusCode === 400) {
        message.error('输入数据有误，请检查表单')
      } else if (error.statusCode === 409) {
        message.error('用户名已存在，请使用其他用户名')
      } else if (error.statusCode === 403) {
        message.error('权限不足，无法创建分判商')
      } else {
        message.error('创建分判商失败，请重试')
      }
    }
  }

  // 门卫表单提交
  const onGuardSubmit = async () => {
    try {
      const v = await guardForm.validateFields()
      
      if (editingGuard) {
        // 编辑门卫 - 暂时使用本地更新，后续可以添加编辑API
        setGuards(prev => prev.map(g => g.id === editingGuard.id ? { ...editingGuard, ...v } : g))
        message.success(t('admin.guardUpdated'))
      } else {
        // 新增门卫 - 调用后端API
        const defaultPwd = v.defaultPassword && String(v.defaultPassword).trim() ? String(v.defaultPassword).trim() : 'Pass@123'
        
        const guardData = {
          guardId: v.guardId,
          name: v.name,
          siteId: v.siteId,
          phone: v.phone,
          email: v.email,
          whatsapp: v.whatsapp,
          username: v.accountUsername || v.guardId,
          password: defaultPwd
        }
        
        const newGuard = await apiService.createGuard(guardData)
        setGuards(prev => [newGuard, ...prev])
        
        message.success(t('admin.guardAddedSuccess').replace('{username}', v.accountUsername || v.guardId).replace('{password}', defaultPwd))
      }
      
      setGuardModalOpen(false)
      setEditingGuard(null)
      guardForm.resetFields()
    } catch (error: any) {
      console.error('Failed to submit guard:', error)
      
      if (error.statusCode === 400) {
        message.error('输入数据有误，请检查表单')
      } else if (error.statusCode === 409) {
        message.error('门卫ID或用户名已存在，请使用其他ID或用户名')
      } else if (error.statusCode === 403) {
        message.error('权限不足，无法创建门卫')
      } else {
        message.error('创建门卫失败，请重试')
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

  const handleSiteImport = async (file: File) => {
    try {
      const { sites: importedSites, errors } = await readSiteExcelFile(file)
      
      if (errors.length > 0) {
        message.error(t('admin.importFailed').replace('{errors}', errors.join('; ')))
        return
      }
      
      if (importedSites.length === 0) {
        message.warning(t('admin.noValidData'))
        return
      }
      
      setSites(prev => [...importedSites, ...prev])
      message.success(t('admin.importSuccess').replace('{count}', importedSites.length.toString()))
    } catch (error) {
      message.error(t('admin.importFailed').replace('{errors}', (error as Error).message))
    }
  }

  const handleDistributorImport = async (file: File) => {
    try {
      const { distributors: importedDistributors, errors } = await readDistributorExcelFile(file)
      
      if (errors.length > 0) {
        message.error(t('admin.importFailed').replace('{errors}', errors.join('; ')))
        return
      }
      
      if (importedDistributors.length === 0) {
        message.warning(t('admin.noValidData'))
        return
      }
      
      setDistributors(prev => [...importedDistributors, ...prev])
      message.success(t('admin.distributorImportSuccess').replace('{count}', importedDistributors.length.toString()))
    } catch (error) {
      message.error(t('admin.importFailed').replace('{errors}', (error as Error).message))
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

  const handleGuardExport = (exportAll: boolean = true) => {
    if (!exportAll && selectedGuardIds.length === 0) {
      message.warning(t('admin.pleaseSelectGuardsToExport'))
      return
    }
    
    // 这里应该调用实际的Excel导出API
    message.success(t('admin.guardsExported'))
  }

  // 门卫管理相关函数
  const handleToggleGuardAccountStatus = (record: Guard) => {
    const newStatus = record.accountStatus === 'active' ? 'disabled' : 'active'
    
    const statusTitle = newStatus === 'active' ? t('admin.enableGuardTitle') : t('admin.disableGuardTitle')
    const statusConfirm = newStatus === 'active' ? t('admin.enableGuardConfirm') : t('admin.disableGuardConfirm')
    const statusSuccess = newStatus === 'active' ? t('admin.enableGuardSuccess') : t('admin.disableGuardSuccess')
    
    Modal.confirm({
      title: statusTitle,
      content: statusConfirm.replace('{name}', record.name),
      okText: t('admin.confirm'),
      cancelText: t('admin.cancel'),
      onOk: () => {
        setGuards(prev => prev.map(g => 
          g.id === record.id ? { ...g, accountStatus: newStatus } : g
        ))
        message.success(statusSuccess.replace('{name}', record.name))
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
      onOk: () => {
        // 这里应该调用后端API重置密码
        message.success(t('admin.resetGuardPasswordSuccess').replace('{name}', record.name))
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
    { title: t('common.actions'), key: 'actions', width: 200, render: (_: any, record: Guard) => (
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
          onClick={() => setGuards(prev => prev.filter(g => g.id !== record.id))}
          title={t('admin.deleteTooltip')}
        />
      </Space>
    )}
  ]

  // 门卫筛选逻辑
  const filteredGuards = useMemo(() => {
    return guards.filter(guard => {
      const matchesKeyword = !guardKeyword.trim() || 
        guard.guardId.toLowerCase().includes(guardKeyword.toLowerCase()) ||
        guard.name.toLowerCase().includes(guardKeyword.toLowerCase()) ||
        guard.phone.includes(guardKeyword)
      
      const matchesSite = guardSiteFilters.length === 0 || guardSiteFilters.includes(guard.siteId)
      
      return matchesKeyword && matchesSite
    })
  }, [guards, guardKeyword, guardSiteFilters])

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
               onClick={() => handleSiteExport(selectedSiteIds.length === 0)}
             >
               {selectedSiteIds.length === 0 ? t('admin.exportAll') : `${t('admin.exportSelected')}(${selectedSiteIds.length})`}
             </Button>
           </Space>
         </Col>
      </Row>
      
      {/* 筛选结果统计 */}
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
      
             <Table 
         rowKey="id" 
         columns={siteColumns} 
         dataSource={filteredSites} 
         loading={loading}
         pagination={{ pageSize: 10, showSizeChanger: true }}
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
        <Col span={5}>
          <Input placeholder={t('admin.distributorKeywordPlaceholder')} value={distributorKeyword} onChange={e => setDistributorKeyword(e.target.value)} allowClear />
        </Col>
        <Col span={5}>
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
        <Col span={5}>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder={t('admin.siteFilterPlaceholder')}
            value={distributorSiteFilters}
            onChange={setDistributorSiteFilters}
            options={sites.map(s => ({ value: s.id, label: s.name }))}
            allowClear
          />
        </Col>
        <Col span={9}>
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
               onClick={() => handleDistributorExport(selectedDistributorIds.length === 0)}
             >
               {selectedDistributorIds.length === 0 ? t('admin.exportAll') : `${t('admin.exportSelected')}(${selectedDistributorIds.length})`}
             </Button>
           </Space>
         </Col>
      </Row>
      
      {/* 筛选结果统计 */}
      <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f5f5f5', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#666', fontSize: '14px' }}>
            {t('admin.filterResults').replace('{count}', filteredDistributors.length.toString())}
            {distributors.length !== filteredDistributors.length && (
              <span style={{ marginLeft: 8, color: '#999' }}>
                {t('admin.fromTotalRecords').replace('{total}', distributors.length.toString())}
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
          {(distributorStatusFilters.length > 0 || distributorSiteFilters.length > 0 || distributorKeyword.trim()) && (
            <Button 
              size="small" 
              onClick={() => {
                setDistributorStatusFilters([])
                setDistributorSiteFilters([])
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
      
             <Table 
         rowKey="id" 
         columns={distributorColumns} 
         dataSource={filteredDistributors} 
         loading={loading}
         pagination={{ pageSize: 10, showSizeChanger: true }}
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
        <Col span={6}>
          <Input placeholder={t('admin.guardKeywordPlaceholder')} value={guardKeyword} onChange={e => setGuardKeyword(e.target.value)} allowClear />
        </Col>
        <Col span={6}>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder={t('admin.guardSiteFilterPlaceholder')}
            value={guardSiteFilters}
            onChange={setGuardSiteFilters}
            allowClear
          >
            {sites.map(site => (
              <Select.Option key={site.id} value={site.id}>{site.name}</Select.Option>
            ))}
          </Select>
        </Col>
        <Col span={12}>
          <Space>
            <Button 
              size="small" 
              icon={<DownloadOutlined />} 
              onClick={() => handleGuardExport(selectedGuardIds.length === 0)}
            >
              {selectedGuardIds.length === 0 ? t('admin.exportAll') : `${t('admin.exportSelected')}(${selectedGuardIds.length})`}
            </Button>
          </Space>
        </Col>
      </Row>
      
      {/* 筛选结果统计 */}
      <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f5f5f5', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#666', fontSize: '14px' }}>
            {t('admin.filterResults').replace('{count}', filteredGuards.length.toString())}
            {guards.length !== filteredGuards.length && (
              <span style={{ marginLeft: 8, color: '#999' }}>
                {t('admin.fromTotalRecords').replace('{total}', guards.length.toString())}
              </span>
            )}
          </span>
        </div>
        
        <Space>
          {(guardSiteFilters.length > 0 || guardKeyword.trim()) && (
            <Button 
              size="small" 
              onClick={() => {
                setGuardSiteFilters([])
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
      
      <Table 
        rowKey="id" 
        columns={guardColumns} 
        dataSource={filteredGuards} 
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true }}
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
                <span style={{ fontSize: '15px', fontWeight: 500 }}>{t('admin.distributorManagement')}（{distributors.length}）</span>
              </div>
            ),
            children: distributorManagementTab
          },
          {
            key: 'guards',
            label: (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
                <KeyOutlined style={{ color: '#fa8c16', fontSize: '16px' }} />
                <span style={{ fontSize: '15px', fontWeight: 500 }}>{t('admin.guardManagement')}（{guards.length}）</span>
              </div>
            ),
            children: guardManagementTab
          },
          {
            key: 'sites',
            label: (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
                <HomeOutlined style={{ color: '#1890ff', fontSize: '16px' }} />
                <span style={{ fontSize: '15px', fontWeight: 500 }}>{t('admin.siteManagement')}（{sites.length}）</span>
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
              title="刷新数据"
            >
              刷新
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
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingDistributor(null); distributorForm.resetFields(); setDistributorModalOpen(true) }}>
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
          <Form.Item name="code" label={t('admin.codeLabel')}>
            <Input placeholder={t('admin.codePlaceholder')} />
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
          <Form.Item name="siteIds" label={t('admin.siteIdsLabel')}>
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
            <Form.Item name="defaultPassword" label={t('admin.defaultPasswordLabel')} tooltip={t('admin.defaultPasswordTooltip')}>
              <Input.Password placeholder={t('admin.defaultPasswordPlaceholder')} />
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
          <Form.Item name="guardId" label={t('admin.guardIdLabel')} rules={[{ required: true, message: t('form.required') }]}>
            <Input placeholder={t('admin.guardIdPlaceholder')} />
          </Form.Item>
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


