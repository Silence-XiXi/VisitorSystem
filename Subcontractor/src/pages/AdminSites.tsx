import React, { useMemo, useState } from 'react'
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

const AdminSites: React.FC = () => {
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

  // 显示发送方式选择对话框（新增分判商时使用）
  const showSendMethodModal = (distributor: Distributor, password: string) => {
    const hasEmail = distributor.email && distributor.email.trim()
    const hasWhatsApp = distributor.whatsapp && distributor.whatsapp.trim()
    
    if (!hasEmail && !hasWhatsApp) {
      // 如果没有联系方式，直接显示成功信息
      message.success(`分判商「${distributor.name}」已新增成功！账号：${distributor.accountUsername}，密码：${password}`)
      return
    }
    
    if (hasEmail && !hasWhatsApp) {
      // 只有Email，直接发送
      // TODO: 调用后端API发送Email
      message.success(`分判商「${distributor.name}」已新增成功！已通过Email发送账号信息给 ${distributor.contactName}`)
      return
    }
    
    if (!hasEmail && hasWhatsApp) {
      // 只有WhatsApp，直接发送
      // TODO: 调用后端API发送WhatsApp
      message.success(`分判商「${distributor.name}」已新增成功！已通过WhatsApp发送账号信息给 ${distributor.contactName}`)
      return
    }
    
    // 两种方式都有，显示选择对话框
    Modal.confirm({
      title: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>选择发送方式</span>
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
          <p>分判商「{distributor.name}」已新增成功！</p>
          <p>账号：<strong>{distributor.accountUsername}</strong></p>
          <p>密码：<strong>{password}</strong></p>
          <p style={{ marginTop: '16px', color: '#666' }}>请选择发送账号信息的方式：</p>
        </div>
      ),
      okText: '通过Email发送',
      cancelText: '通过WhatsApp发送',
      onCancel: () => {
        // TODO: 调用后端API发送WhatsApp
        message.success(`已通过WhatsApp发送账号信息给 ${distributor.contactName}`)
      },
      onOk: () => {
        // TODO: 调用后端API发送Email
        message.success(`已通过Email发送账号信息给 ${distributor.contactName}`)
      }
    })
  }



  // 重置分判商密码
  const handleResetPassword = (record: Distributor) => {
    Modal.confirm({
      title: '重置默认密码',
      content: (
        <div>
          <p>确定要为分判商「{record.name}」重置密码吗？</p>
          <p style={{ color: '#999' }}>重置后默认密码将设置为 Pass@123，请尽快通知对方修改。</p>
        </div>
      ),
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        // TODO: 调用后端API执行重置
        message.success(`已为 ${record.name} 重置密码，默认密码：Pass@123`)
      }
    })
  }

  // 切换工地状态
  const handleToggleSiteStatus = (record: Site) => {
    const newStatus = record.status === 'active' ? 'inactive' : 'active'
    const statusText = newStatus === 'active' ? '启用' : '停用'
    
    Modal.confirm({
      title: `${statusText}工地`,
      content: (
        <div>
          <p>确定要{statusText}工地「{record.name}」吗？</p>
        </div>
      ),
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        setSites(prev => prev.map(s => s.id === record.id ? { ...s, status: newStatus } : s))
        message.success(`工地「${record.name}」已${statusText}`)
      }
    })
  }

  // 切换分判商账号状态
  const handleToggleDistributorStatus = (record: Distributor) => {
    const newStatus = record.accountStatus === 'active' ? 'disabled' : 'active'
    const statusText = newStatus === 'active' ? '启用' : '禁用'
    
    Modal.confirm({
      title: `${statusText}分判商账号`,
      content: (
        <div>
          <p>确定要{statusText}分判商「{record.name}」的账号吗？</p>
        </div>
      ),
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        setDistributors(prev => prev.map(d => d.id === record.id ? { ...d, accountStatus: newStatus } : d))
        message.success(`分判商「${record.name}」账号已${statusText}`)
      }
    })
  }

  // 工地表格列定义
  const siteColumns = [
    { title: '工地ID', dataIndex: 'id', key: 'id', width: 100 },
    { title: '名称', dataIndex: 'name', key: 'name', width: 160 },
    { title: '地址', dataIndex: 'address', key: 'address' },
    { title: '负责人', dataIndex: 'manager', key: 'manager', width: 120 },
    { title: '联系电话', dataIndex: 'phone', key: 'phone', width: 140 },
    { title: '状态', dataIndex: 'status', key: 'status', width: 100, render: (s?: string) => {
      const map: any = { active: { color: 'green', text: '启用' }, inactive: { color: 'red', text: '停用' }, suspended: { color: 'orange', text: '暂停' } }
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
    { title: '操作', key: 'actions', width: 180, render: (_: any, record: Site) => (
      <Space style={{ justifyContent: 'flex-end' }}>
        <Button 
          size="small" 
          icon={<EditOutlined />} 
          onClick={() => { setEditingSite(record); siteForm.setFieldsValue(record); setSiteModalOpen(true) }}
          title="编辑"
        />
        <Button 
          size="small" 
          icon={record.status === 'active' ? <StopOutlined /> : <CheckCircleOutlined />}
          type={record.status === 'active' ? 'default' : 'primary'}
          onClick={() => handleToggleSiteStatus(record)}
          title={record.status === 'active' ? '停用' : '启用'}
        />
        <Button 
          danger 
          size="small" 
          icon={<DeleteOutlined />} 
          onClick={() => setSites(prev => prev.filter(s => s.id !== record.id))}
          title="删除"
        />
      </Space>
    )}
  ]

  // 分判商表格列定义
  const distributorColumns = [
    { title: '分判商ID', dataIndex: 'id', key: 'id', width: 100 },
    { title: '名称', dataIndex: 'name', key: 'name', width: 160 },
    { title: '联系人', dataIndex: 'contactName', key: 'contactName', width: 120 },
    { title: '电话', dataIndex: 'phone', key: 'phone', width: 140 },
    { title: '邮箱', dataIndex: 'email', key: 'email', width: 200 },
    { title: '服务工地', dataIndex: 'siteIds', key: 'siteIds', width: 200, render: (siteIds?: string[]) => {
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
    { title: '账号', dataIndex: 'accountUsername', key: 'accountUsername', width: 140 },
    { title: '账号状态', dataIndex: 'accountStatus', key: 'accountStatus', width: 100, render: (s?: string) => {
      const map: any = { active: { color: 'green', text: '启用' }, disabled: { color: 'red', text: '禁用' } }
      const cfg = map[s || 'active']
      return <Tag color={cfg.color}>{cfg.text}</Tag>
    } },
         { title: '操作', key: 'actions', width: 280, render: (_: any, record: Distributor) => (
       <Space style={{ justifyContent: 'flex-end' }}>
         <Button 
           size="small" 
           icon={<EditOutlined />} 
           onClick={() => { setEditingDistributor(record); distributorForm.setFieldsValue(record); setDistributorModalOpen(true) }}
           title="编辑"
         />
         <Button 
           size="small" 
           icon={record.accountStatus === 'active' ? <StopOutlined /> : <CheckCircleOutlined />}
           type={record.accountStatus === 'active' ? 'default' : 'primary'}
           onClick={() => handleToggleDistributorStatus(record)}
           title={record.accountStatus === 'active' ? '禁用' : '启用'}
         />
                   <Button 
            size="small" 
            icon={<KeyOutlined />} 
            onClick={() => handleResetPassword(record)}
            title="重置密码"
          />
          <Button 
           danger 
           size="small" 
           icon={<DeleteOutlined />} 
           onClick={() => setDistributors(prev => prev.filter(d => d.id !== record.id))}
           title="删除"
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
      message.warning('请先选择要发送的分判商')
      return
    }

    const selectedDistributors = distributors.filter(d => selectedDistributorIds.includes(d.id))
    const hasEmailDistributors = selectedDistributors.filter(d => d.email && d.email.trim())
    const noEmailDistributors = selectedDistributors.filter(d => !d.email || !d.email.trim())

    if (hasEmailDistributors.length === 0) {
      message.warning('选中的分判商都没有填写Email联系方式')
      return
    }

    Modal.confirm({
      title: '批量发送账号密码到Email',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>确定要批量发送账号密码到Email吗？</p>
          <p style={{ marginTop: '8px', color: '#1890ff' }}>
            将发送给 {hasEmailDistributors.length} 个分判商
          </p>
          {noEmailDistributors.length > 0 && (
            <p style={{ marginTop: '8px', color: '#ff4d4f' }}>
              注意：{noEmailDistributors.length} 个分判商没有Email联系方式，将跳过发送
            </p>
          )}
        </div>
      ),
      okText: '确定发送',
      cancelText: '取消',
      onOk: () => {
        // TODO: 调用后端API批量发送Email
        message.success(`已批量发送账号密码到 ${hasEmailDistributors.length} 个分判商的Email`)
        if (noEmailDistributors.length > 0) {
          message.warning(`${noEmailDistributors.length} 个分判商因无Email联系方式而跳过`)
        }
      }
    })
  }

  // 批量发送账号密码到WhatsApp
  const handleBatchSendWhatsApp = () => {
    if (selectedDistributorIds.length === 0) {
      message.warning('请先选择要发送的分判商')
      return
    }

    const selectedDistributors = distributors.filter(d => selectedDistributorIds.includes(d.id))
    const hasWhatsAppDistributors = selectedDistributors.filter(d => d.whatsapp && d.whatsapp.trim())
    const noWhatsAppDistributors = selectedDistributors.filter(d => !d.whatsapp || !d.whatsapp.trim())

    if (hasWhatsAppDistributors.length === 0) {
      message.warning('选中的分判商都没有填写WhatsApp联系方式')
      return
    }

    Modal.confirm({
      title: '批量发送账号密码到WhatsApp',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>确定要批量发送账号密码到WhatsApp吗？</p>
          <p style={{ marginTop: '8px', color: '#1890ff' }}>
            将发送给 {hasWhatsAppDistributors.length} 个分判商
          </p>
          {noWhatsAppDistributors.length > 0 && (
            <p style={{ marginTop: '8px', color: '#ff4d4f' }}>
              注意：{noWhatsAppDistributors.length} 个分判商没有WhatsApp联系方式，将跳过发送
            </p>
          )}
        </div>
      ),
      okText: '确定发送',
      cancelText: '取消',
      onOk: () => {
        // TODO: 调用后端API批量发送WhatsApp
        message.success(`已批量发送账号密码到 ${hasWhatsAppDistributors.length} 个分判商的WhatsApp`)
        if (noWhatsAppDistributors.length > 0) {
          message.warning(`${noWhatsAppDistributors.length} 个分判商因无WhatsApp联系方式而跳过`)
        }
      }
    })
  }

  // 工地表单提交
  const onSiteSubmit = async () => {
    const v = await siteForm.validateFields()
    if (editingSite) {
      setSites(prev => prev.map(s => s.id === editingSite.id ? { ...editingSite, ...v } : s))
      message.success('工地已更新')
    } else {
      const newItem: Site = { id: (Date.now()).toString(), code: v.code || '', name: v.name, address: v.address, manager: v.manager, phone: v.phone, status: v.status, distributorIds: v.distributorIds }
      setSites(prev => [newItem, ...prev])
      message.success('工地已新增')
    }
    setSiteModalOpen(false)
    setEditingSite(null)
    siteForm.resetFields()
  }

  // 分判商表单提交
  const onDistributorSubmit = async () => {
    const v = await distributorForm.validateFields()
    if (editingDistributor) {
      setDistributors(prev => prev.map(d => d.id === editingDistributor.id ? { ...editingDistributor, ...v } : d))
      message.success('分判商已更新')
    } else {
      const defaultPwd = v.defaultPassword && String(v.defaultPassword).trim() ? String(v.defaultPassword).trim() : 'Pass@123'
      const newItem: Distributor = { id: (Date.now()).toString(), name: v.name, siteIds: v.siteIds, contactName: v.contactName, phone: v.phone, email: v.email, whatsapp: v.whatsapp, accountUsername: v.accountUsername, accountStatus: v.accountStatus }
      setDistributors(prev => [newItem, ...prev])
      // 显示发送方式选择对话框
      showSendMethodModal(newItem, defaultPwd)
    }
    setDistributorModalOpen(false)
    setEditingDistributor(null)
    distributorForm.resetFields()
  }

  // 门卫表单提交
  const onGuardSubmit = async () => {
    const v = await guardForm.validateFields()
    if (editingGuard) {
      setGuards(prev => prev.map(g => g.id === editingGuard.id ? { ...editingGuard, ...v } : g))
      message.success('门卫已更新')
    } else {
      const defaultPwd = v.defaultPassword && String(v.defaultPassword).trim() ? String(v.defaultPassword).trim() : 'Pass@123'
      const newItem: Guard = { 
        id: (Date.now()).toString(), 
        guardId: v.guardId,
        name: v.name, 
        siteId: v.siteId, 
        phone: v.phone, 
        email: v.email, 
        whatsapp: v.whatsapp, 
        accountUsername: v.accountUsername, 
        accountStatus: v.accountStatus || 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      setGuards(prev => [newItem, ...prev])
      message.success(`门卫已新增！账号：${v.accountUsername || v.guardId}，密码：${defaultPwd}`)
    }
    setGuardModalOpen(false)
    setEditingGuard(null)
    guardForm.resetFields()
  }

  // Excel导入导出处理函数
  const handleSiteExport = (exportAll: boolean = true) => {
    const dataToExport = exportAll ? sites : sites.filter(site => selectedSiteIds.includes(site.id))
    
    if (!exportAll && selectedSiteIds.length === 0) {
      message.warning('请先选择要导出的工地')
      return
    }
    
    exportSitesToExcel(dataToExport, distributors)
    message.success(`已导出 ${dataToExport.length} 条工地信息`)
  }

  const handleDistributorExport = (exportAll: boolean = true) => {
    const dataToExport = exportAll ? distributors : distributors.filter(distributor => selectedDistributorIds.includes(distributor.id))
    
    if (!exportAll && selectedDistributorIds.length === 0) {
      message.warning('请先选择要导出的分判商')
      return
    }
    
    exportDistributorsToExcel(dataToExport, sites)
    message.success(`已导出 ${dataToExport.length} 条分判商信息`)
  }

  const handleSiteImport = async (file: File) => {
    try {
      const { sites: importedSites, errors } = await readSiteExcelFile(file)
      
      if (errors.length > 0) {
        message.error(`导入失败：${errors.join('; ')}`)
        return
      }
      
      if (importedSites.length === 0) {
        message.warning('没有有效数据可导入')
        return
      }
      
      setSites(prev => [...importedSites, ...prev])
      message.success(`成功导入 ${importedSites.length} 条工地信息`)
    } catch (error) {
      message.error('导入失败：' + (error as Error).message)
    }
  }

  const handleDistributorImport = async (file: File) => {
    try {
      const { distributors: importedDistributors, errors } = await readDistributorExcelFile(file)
      
      if (errors.length > 0) {
        message.error(`导入失败：${errors.join('; ')}`)
        return
      }
      
      if (importedDistributors.length === 0) {
        message.warning('没有有效数据可导入')
        return
      }
      
      setDistributors(prev => [...importedDistributors, ...prev])
      message.success(`成功导入 ${importedDistributors.length} 条分判商信息`)
    } catch (error) {
      message.error('导入失败：' + (error as Error).message)
    }
  }

  const handleDownloadSiteTemplate = () => {
    generateSiteImportTemplate()
    message.success('工地导入模板已下载')
  }

  const handleDownloadDistributorTemplate = () => {
    generateDistributorImportTemplate()
    message.success('分判商导入模板已下载')
  }

  const handleGuardExport = (exportAll: boolean = true) => {
    if (!exportAll && selectedGuardIds.length === 0) {
      message.warning('请先选择要导出的门卫')
      return
    }
    
    // 这里应该调用实际的Excel导出API
    message.success('门卫Excel文件下载中...')
  }

  // 门卫管理相关函数
  const handleToggleGuardAccountStatus = (record: Guard) => {
    const newStatus = record.accountStatus === 'active' ? 'disabled' : 'active'
    const statusText = newStatus === 'active' ? '启用' : '禁用'
    
    Modal.confirm({
      title: `${statusText}门卫账号`,
      content: `确定要${statusText}门卫「${record.name}」的账号吗？`,
      onOk: () => {
        setGuards(prev => prev.map(g => 
          g.id === record.id ? { ...g, accountStatus: newStatus } : g
        ))
        message.success(`门卫「${record.name}」的账号已${statusText}`)
      }
    })
  }

  // 重置门卫密码
  const handleResetGuardPassword = (record: Guard) => {
    Modal.confirm({
      title: '重置门卫密码',
      content: `确定要重置门卫「${record.name}」的密码吗？重置后密码将恢复为默认密码。`,
      onOk: () => {
        // 这里应该调用后端API重置密码
        message.success(`门卫「${record.name}」的密码已重置为默认密码`)
      }
    })
  }

  // 门卫列定义
  const guardColumns = [
    { title: '门卫编号', dataIndex: 'guardId', key: 'guardId', width: 120, sorter: (a: Guard, b: Guard) => a.guardId.localeCompare(b.guardId) },
    { title: '姓名', dataIndex: 'name', key: 'name', width: 120, sorter: (a: Guard, b: Guard) => a.name.localeCompare(b.name) },
    { title: '所属工地', dataIndex: 'siteId', key: 'siteId', width: 150, 
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
    { title: '联系电话', dataIndex: 'phone', key: 'phone', width: 130, sorter: (a: Guard, b: Guard) => a.phone.localeCompare(b.phone) },
    { title: '邮箱', dataIndex: 'email', key: 'email', width: 180, sorter: (a: Guard, b: Guard) => (a.email || '').localeCompare(b.email || '') },
    { title: 'WhatsApp', dataIndex: 'whatsapp', key: 'whatsapp', width: 130, sorter: (a: Guard, b: Guard) => (a.whatsapp || '').localeCompare(b.whatsapp || '') },
    { title: '账号', dataIndex: 'accountUsername', key: 'accountUsername', width: 120, sorter: (a: Guard, b: Guard) => (a.accountUsername || '').localeCompare(b.accountUsername || '') },
    { title: '账号状态', dataIndex: 'accountStatus', key: 'accountStatus', width: 100,
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '启用' : '禁用'}
        </Tag>
      ),
      sorter: (a: Guard, b: Guard) => (a.accountStatus || '').localeCompare(b.accountStatus || '')
    },
    { title: '操作', key: 'actions', width: 200, render: (_: any, record: Guard) => (
      <Space style={{ justifyContent: 'flex-end' }}>
        <Button 
          size="small" 
          icon={<EditOutlined />} 
          onClick={() => { setEditingGuard(record); guardForm.setFieldsValue(record); setGuardModalOpen(true) }}
          title="编辑"
        />
        <Button 
          size="small" 
          icon={<KeyOutlined />}
          onClick={() => handleResetGuardPassword(record)}
          title="重置密码"
        />
        <Button 
          size="small" 
          icon={record.accountStatus === 'active' ? <StopOutlined /> : <CheckCircleOutlined />}
          type={record.accountStatus === 'active' ? 'default' : 'primary'}
          onClick={() => handleToggleGuardAccountStatus(record)}
          title={record.accountStatus === 'active' ? '禁用账号' : '启用账号'}
        />
        <Button 
          danger 
          size="small" 
          icon={<DeleteOutlined />} 
          onClick={() => setGuards(prev => prev.filter(g => g.id !== record.id))}
          title="删除"
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
          <Input placeholder="关键词（名称/地址/编码）" value={siteKeyword} onChange={e => setSiteKeyword(e.target.value)} allowClear />
        </Col>
        <Col span={5}>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="状态筛选（可多选）"
            value={siteStatusFilters}
            onChange={setSiteStatusFilters}
            options={[{ value: 'active', label: '启用' }, { value: 'suspended', label: '暂停' }, { value: 'inactive', label: '停用' }]}
            allowClear
          />
        </Col>
        <Col span={5}>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="负责人筛选（可多选）"
            value={siteManagerFilters}
            onChange={setSiteManagerFilters}
            options={siteManagerOptions}
            allowClear
          />
        </Col>
        <Col span={9}>
           <Space wrap>
             <Button size="small" icon={<DownloadOutlined />} onClick={handleDownloadSiteTemplate}>下载模板</Button>
             <Upload
               accept=".xlsx,.xls"
               showUploadList={false}
               beforeUpload={(file) => {
                 handleSiteImport(file)
                 return false
               }}
             >
               <Button size="small" icon={<UploadOutlined />}>导入Excel</Button>
             </Upload>
             <Button 
               size="small"
               icon={<DownloadOutlined />} 
               onClick={() => handleSiteExport(selectedSiteIds.length === 0)}
             >
               {selectedSiteIds.length === 0 ? '导出全部' : `导出已选(${selectedSiteIds.length})`}
             </Button>
           </Space>
         </Col>
      </Row>
      
      {/* 筛选结果统计 */}
      <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f5f5f5', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#666', fontSize: '14px' }}>
          筛选结果：共 <strong style={{ color: '#1890ff' }}>{filteredSites.length}</strong> 条记录
          {sites.length !== filteredSites.length && (
            <span style={{ marginLeft: 8, color: '#999' }}>
              （从 {sites.length} 条记录中筛选）
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
               清除筛选
             </Button>
           )}
           {selectedSiteIds.length > 0 && (
             <Button 
               size="small" 
               onClick={() => setSelectedSiteIds([])}
             >
               清除选择({selectedSiteIds.length})
             </Button>
           )}
         </Space>
      </div>
      
             <Table 
         rowKey="id" 
         columns={siteColumns} 
         dataSource={filteredSites} 
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
          <Input placeholder="关键词（名称/联系人）" value={distributorKeyword} onChange={e => setDistributorKeyword(e.target.value)} allowClear />
        </Col>
        <Col span={5}>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="账号状态（可多选）"
            value={distributorStatusFilters}
            onChange={setDistributorStatusFilters}
            options={[{ value: 'active', label: '启用' }, { value: 'disabled', label: '禁用' }]}
            allowClear
          />
        </Col>
        <Col span={5}>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="服务工地（可多选）"
            value={distributorSiteFilters}
            onChange={setDistributorSiteFilters}
            options={sites.map(s => ({ value: s.id, label: s.name }))}
            allowClear
          />
        </Col>
        <Col span={9}>
           <Space wrap>
             <Button size="small" icon={<DownloadOutlined />} onClick={handleDownloadDistributorTemplate}>下载模板</Button>
             <Upload
               accept=".xlsx,.xls"
               showUploadList={false}
               beforeUpload={(file) => {
                 handleDistributorImport(file)
                 return false
               }}
             >
               <Button size="small" icon={<UploadOutlined />}>导入Excel</Button>
             </Upload>
             <Button 
               size="small"
               icon={<DownloadOutlined />} 
               onClick={() => handleDistributorExport(selectedDistributorIds.length === 0)}
             >
               {selectedDistributorIds.length === 0 ? '导出全部' : `导出已选(${selectedDistributorIds.length})`}
             </Button>
           </Space>
         </Col>
      </Row>
      
      {/* 筛选结果统计 */}
      <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f5f5f5', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#666', fontSize: '14px' }}>
            筛选结果：共 <strong style={{ color: '#1890ff' }}>{filteredDistributors.length}</strong> 条记录
            {distributors.length !== filteredDistributors.length && (
              <span style={{ marginLeft: 8, color: '#999' }}>
                （从 {distributors.length} 条记录中筛选）
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
                title="批量发送账号密码到Email"
              >
                批量发送Email
              </Button>
              <Button 
                size="small" 
                type="primary"
                icon={<SendOutlined />}
                onClick={() => handleBatchSendWhatsApp()}
                title="批量发送账号密码到WhatsApp"
              >
                批量发送WhatsApp
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
              清除筛选
            </Button>
          )}
          {selectedDistributorIds.length > 0 && (
            <Button 
              size="small" 
              onClick={() => setSelectedDistributorIds([])}
            >
              清除选择({selectedDistributorIds.length})
            </Button>
          )}
        </Space>
      </div>
      
             <Table 
         rowKey="id" 
         columns={distributorColumns} 
         dataSource={filteredDistributors} 
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
          <Input placeholder="关键词（编号/姓名/电话）" value={guardKeyword} onChange={e => setGuardKeyword(e.target.value)} allowClear />
        </Col>
        <Col span={6}>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="工地筛选（可多选）"
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
              {selectedGuardIds.length === 0 ? '导出全部' : `导出已选(${selectedGuardIds.length})`}
            </Button>
          </Space>
        </Col>
      </Row>
      
      {/* 筛选结果统计 */}
      <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f5f5f5', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#666', fontSize: '14px' }}>
            筛选结果：共 <strong style={{ color: '#1890ff' }}>{filteredGuards.length}</strong> 条记录
            {guards.length !== filteredGuards.length && (
              <span style={{ marginLeft: 8, color: '#999' }}>
                （从 {guards.length} 条记录中筛选）
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
              清除筛选
            </Button>
          )}
          {selectedGuardIds.length > 0 && (
            <Button 
              size="small" 
              onClick={() => setSelectedGuardIds([])}
            >
              清除选择({selectedGuardIds.length})
            </Button>
          )}
        </Space>
      </div>
      
      <Table 
        rowKey="id" 
        columns={guardColumns} 
        dataSource={filteredGuards} 
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
                <span style={{ fontSize: '15px', fontWeight: 500 }}>分判商管理（{distributors.length}）</span>
              </div>
            ),
            children: distributorManagementTab
          },
          {
            key: 'guards',
            label: (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
                <KeyOutlined style={{ color: '#fa8c16', fontSize: '16px' }} />
                <span style={{ fontSize: '15px', fontWeight: 500 }}>门卫管理（{guards.length}）</span>
              </div>
            ),
            children: guardManagementTab
          },
          {
            key: 'sites',
            label: (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
                <HomeOutlined style={{ color: '#1890ff', fontSize: '16px' }} />
                <span style={{ fontSize: '15px', fontWeight: 500 }}>工地管理（{sites.length}）</span>
              </div>
            ),
            children: siteManagementTab
          }
        ]}
        tabBarExtraContent={
          activeTab === 'sites' ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingSite(null); siteForm.resetFields(); setSiteModalOpen(true) }}>
              新增工地
            </Button>
          ) : activeTab === 'guards' ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingGuard(null); guardForm.resetFields(); setGuardModalOpen(true) }}>
              新增门卫
            </Button>
          ) : (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingDistributor(null); distributorForm.resetFields(); setDistributorModalOpen(true) }}>
              新增分判商
            </Button>
          )
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
      <Modal title={editingSite ? '编辑工地' : '新增工地'} open={siteModalOpen} onCancel={() => { setSiteModalOpen(false); setEditingSite(null) }} onOk={onSiteSubmit} destroyOnClose>
        <Form form={siteForm} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="请输入工地名称" />
          </Form.Item>
          <Form.Item name="code" label="编码">
            <Input placeholder="例如：BJ-CBD-001" />
          </Form.Item>
          <Form.Item name="address" label="地址" rules={[{ required: true, message: '请输入地址' }]}>
            <Input placeholder="请输入工地地址" />
          </Form.Item>
          <Form.Item name="manager" label="负责人">
            <Input placeholder="责任人姓名" />
          </Form.Item>
          <Form.Item name="phone" label="联系电话">
            <Input placeholder="电话" />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue={'active'}>
            <Select options={[{ value: 'active', label: '启用' }, { value: 'suspended', label: '暂停' }, { value: 'inactive', label: '停用' }]} />
          </Form.Item>
          <Form.Item name="distributorIds" label="关联分判商">
            <Select 
              mode="multiple" 
              placeholder="请选择分判商（可多选）" 
              options={distributors.map(d => ({ value: d.id, label: d.name }))} 
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 分判商管理模态框 */}
      <Modal title={editingDistributor ? '编辑分判商' : '新增分判商'} open={distributorModalOpen} onCancel={() => { setDistributorModalOpen(false); setEditingDistributor(null) }} onOk={onDistributorSubmit} destroyOnClose>
        <Form form={distributorForm} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="请输入分判商名称" />
          </Form.Item>
          <Form.Item name="contactName" label="联系人">
            <Input placeholder="联系人姓名" />
          </Form.Item>
          <Form.Item name="siteIds" label="服务工地">
            <Select 
              mode="multiple" 
              placeholder="请选择工地（可多选）" 
              options={sites.map(s => ({ value: s.id, label: s.name }))} 
            />
          </Form.Item>
          <Form.Item name="phone" label="电话">
            <Input placeholder="联系电话" />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input placeholder="邮箱" />
          </Form.Item>
          <Form.Item name="whatsapp" label="WhatsApp">
            <Input placeholder="WhatsApp号码（例如：+86 13800138000）" />
          </Form.Item>
          <Form.Item name="accountUsername" label="账号">
            <Input placeholder="登录账号" />
          </Form.Item>
          {!editingDistributor && (
            <Form.Item name="defaultPassword" label="默认密码" tooltip="若不填写将使用默认密码 Pass@123">
              <Input.Password placeholder="默认密码（留空则使用 Pass@123）" />
            </Form.Item>
          )}
          <Form.Item name="accountStatus" label="账号状态" initialValue={'active'}>
            <Select options={[{ value: 'active', label: '启用' }, { value: 'disabled', label: '禁用' }]} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 门卫管理模态框 */}
      <Modal title={editingGuard ? '编辑门卫' : '新增门卫'} open={guardModalOpen} onCancel={() => { setGuardModalOpen(false); setEditingGuard(null) }} onOk={onGuardSubmit} destroyOnClose>
        <Form form={guardForm} layout="vertical">
          <Form.Item name="guardId" label="门卫编号" rules={[{ required: true, message: '请输入门卫编号' }]}>
            <Input placeholder="请输入门卫编号（如：G001）" />
          </Form.Item>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="请输入门卫姓名" />
          </Form.Item>
          <Form.Item name="siteId" label="所属工地" rules={[{ required: true, message: '请选择工地' }]}>
            <Select 
              placeholder="请选择工地" 
              options={sites.map(s => ({ value: s.id, label: s.name }))} 
            />
          </Form.Item>
          <Form.Item name="phone" label="联系电话" rules={[{ required: true, message: '请输入联系电话' }]}>
            <Input placeholder="联系电话" />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input placeholder="邮箱" />
          </Form.Item>
          <Form.Item name="whatsapp" label="WhatsApp">
            <Input placeholder="WhatsApp号码（例如：+86 13800138000）" />
          </Form.Item>
          <Form.Item name="accountUsername" label="账号">
            <Input placeholder="登录账号" />
          </Form.Item>
          {!editingGuard && (
            <Form.Item name="defaultPassword" label="初始密码" tooltip="若不填写将使用默认密码 Pass@123">
              <Input.Password placeholder="初始密码（留空则使用 Pass@123）" />
            </Form.Item>
          )}
          <Form.Item name="accountStatus" label="账号状态" initialValue={'active'}>
            <Select options={[{ value: 'active', label: '启用' }, { value: 'disabled', label: '禁用' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default AdminSites


