import React, { useState, useEffect } from 'react'
import { Table, Button, Space, Modal, Form, Input, Select, Tag, message, Row, Col, Upload, Pagination, Card } from 'antd'
import { 
  EditOutlined, 
  DeleteOutlined, 
  KeyOutlined, 
  ExclamationCircleOutlined, 
  CheckCircleOutlined, 
  StopOutlined, 
  UploadOutlined, 
  DownloadOutlined, 
  SendOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { Site, Distributor } from '../../types/worker'
import { useLocale } from '../../contexts/LocaleContext'
import { apiService } from '../../services/api'
import { 
  exportDistributorsToExcel,
  readDistributorExcelFile,
  generateDistributorImportTemplate
} from '../../utils/excelUtils'
import SimpleEmailProgressModal from '../../components/AdminSites/SimpleEmailProgressModal'
import FailedDistributorItemsContent from '../../components/AdminSites/FailedDistributorItemsContent'

interface DistributorManagementProps {
  distributors: Distributor[]
  setDistributors: React.Dispatch<React.SetStateAction<Distributor[]>>
  sites: Site[]
  selectedSiteId?: string
  onBatchUpdateStatus?: (type: 'distributors', ids: string[], status: string) => void
  loading: boolean
  loadData: () => void
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  setBatchUpdateStatusModalOpen?: React.Dispatch<React.SetStateAction<boolean>>
  setBatchUpdateStatusType?: React.Dispatch<React.SetStateAction<'sites' | 'distributors' | 'guards'>>
}

// 失败项内容组件类型
interface FailedItem {
  email: string;
  name: string;
  contactName: string;
  username: string;
  success: boolean;
  message?: string;
}

const DistributorManagement: React.FC<DistributorManagementProps> = ({
  distributors,
  setDistributors,
  sites,
  selectedSiteId,
  onBatchUpdateStatus,
  loading,
  loadData,
  setLoading,
  setBatchUpdateStatusModalOpen,
  setBatchUpdateStatusType
}) => {
  const { t } = useLocale()
  
  // 分判商管理状态
  const [distributorModalOpen, setDistributorModalOpen] = useState(false)
  const [editingDistributor, setEditingDistributor] = useState<Distributor | null>(null)
  const [distributorForm] = Form.useForm()
  const [selectedDistributorIds, setSelectedDistributorIds] = useState<string[]>([])
  
  // 分判商筛选状态
  const [distributorStatusFilters, setDistributorStatusFilters] = useState<string[]>([])
  const [distributorKeyword, setDistributorKeyword] = useState<string>('')
  
  // 邮件发送状态
  const [emailModalVisible, setEmailModalVisible] = useState(false)
  const [emailProgress, setEmailProgress] = useState(0)
  const [emailTotal, setEmailTotal] = useState(0)
  const [emailSuccessCount, setEmailSuccessCount] = useState(0)
  const [emailFailedItems, setEmailFailedItems] = useState<FailedItem[]>([])
  const [resendingEmails, setResendingEmails] = useState(false)
  const [exportOptionsVisible, setExportOptionsVisible] = useState(false)
  
  // 分页状态
  const [distributorPagination, setDistributorPagination] = useState({
    current: 1,
    pageSize: 10,
    total: distributors.length
  })

  // 更新分页信息
  useEffect(() => {
    setDistributorPagination(prev => ({ ...prev, total: filteredDistributors.length }))
  }, [distributors, distributorStatusFilters, distributorKeyword])
  
  // 分判商全局筛选后的数据（仅按工地筛选）
  const globalFilteredDistributors = distributors.filter(d => {
    return !selectedSiteId || (d.siteIds && d.siteIds.includes(selectedSiteId))
  })
  
  // 分判商筛选后的数据
  const filteredDistributors = globalFilteredDistributors.filter(d => {
    // 状态筛选
    const statusMatch = distributorStatusFilters.length === 0 || 
      (d.accountStatus && distributorStatusFilters.includes(d.accountStatus))
    
    // 关键词筛选
    const keyword = distributorKeyword.toLowerCase().trim()
    const keywordMatch = !keyword || 
      (d.name && d.name.toLowerCase().includes(keyword)) || 
      (d.contactName && d.contactName.toLowerCase().includes(keyword)) || 
      (d.phone && d.phone.toLowerCase().includes(keyword)) ||
      (d.email && d.email.toLowerCase().includes(keyword)) ||
      (d.accountUsername && d.accountUsername.toLowerCase().includes(keyword))
    
    return statusMatch && keywordMatch
  })
  
  // 当前页的数据
  const paginatedDistributors = filteredDistributors.slice(
    (distributorPagination.current - 1) * distributorPagination.pageSize,
    distributorPagination.current * distributorPagination.pageSize
  )

  // 处理分页变化
  const handleDistributorPaginationChange = (page: number, pageSize?: number) => {
    setDistributorPagination({
      ...distributorPagination,
      current: page,
      pageSize: pageSize || distributorPagination.pageSize
    })
  }

  // 分判商表格列定义
  const distributorColumns = [
    { title: t('admin.distributorId'), dataIndex: 'distributorId', key: 'distributorId', width: 100 },
    { title: t('admin.distributorName'), dataIndex: 'name', key: 'name', width: 200 },
    { title: t('admin.distributorContact'), dataIndex: 'contactName', key: 'contactName', width: 120 },
    { title: t('admin.distributorPhone'), dataIndex: 'phone', key: 'phone', width: 140 },
    { title: t('admin.distributorEmail'), dataIndex: 'email', key: 'email', width: 200 },
    // { title: t('admin.distributorWhatsapp'), dataIndex: 'whatsapp', key: 'whatsapp', width: 160 },
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
    { title: t('common.actions'), key: 'actions', width: 140, fixed: 'right' as const, render: (_: unknown, record: Distributor) => (
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
          onClick={() => handleToggleDistributorStatus(record)}
          title={record.accountStatus === 'active' ? t('admin.disableAccountTooltip') : t('admin.enableAccountTooltip')}
          style={{ color: record.accountStatus === 'active' ? '#ff4d4f' : '#52c41a' }}
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

  // 处理表格选择变化
  const rowSelection = {
    selectedRowKeys: selectedDistributorIds,
    onChange: (selectedRowKeys: React.Key[]) => {
      setSelectedDistributorIds(selectedRowKeys as string[])
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
        
        const updatedDistributor = await apiService.updateDistributor(editingDistributor.id, updateData)
        
        setDistributors(prev => prev.map(d => d.id === editingDistributor.id ? {
          ...d,
          ...updateData,
          id: editingDistributor.id
        } : d))
        
        message.success(t('messages.distributorUpdated'))
      } else {
        // 新建分判商 - 调用后端API
        const newDistributor = {
          name: v.name,
          contactName: v.contactName,
          phone: v.phone,
          email: v.email,
          whatsapp: v.whatsapp,
          siteIds: v.siteIds || [],
          accountUsername: v.accountUsername,
          accountStatus: 'active'
        }
        
        // 创建新分判商
        const createdDistributor = await apiService.createDistributor(newDistributor)
        
        // 更新状态
        setDistributors(prev => [...prev, {
          ...newDistributor,
          id: createdDistributor.id,
          distributorId: createdDistributor.distributorId
        }])
        
        message.success(t('messages.distributorCreated'))
      }
      
      setDistributorModalOpen(false)
      setEditingDistributor(null)
      distributorForm.resetFields()
    } catch (error: unknown) {
      console.error('Failed to submit distributor:', error)
      
      const err = error as { statusCode?: number; message?: string }
      if (err.statusCode === 400) {
        message.error(t('messages.inputDataError'))
      } else if (err.statusCode === 409) {
        message.error(t('messages.distributorEmailOrUsernameExists'))
      } else if (err.statusCode === 403) {
        message.error(t('messages.insufficientPermissions'))
      } else {
        message.error(editingDistributor ? t('messages.updateDistributorFailed') : t('messages.createDistributorFailed'))
      }
    }
  }

  // 处理分判商导入
  const handleDistributorImport = async (file: File) => {
    try {
      const { distributors: importedDistributors, errors } = await readDistributorExcelFile(file, sites)
      
      if (errors.length > 0) {
        message.error(t('admin.importFailed').replace('{errors}', errors.join('; ')))
        return
      }
      
      if (importedDistributors.length === 0) {
        message.warning(t('messages.noValidDistributorData'))
        return
      }
      
      // 开始处理导入，设置加载状态
      setLoading(true)
      
      // 分批导入新分判商
      // TODO: 调用正确的API
      const result = await apiService.importDistributorWorkers(importedDistributors as any)
      
      // 更新状态
      setDistributors(prev => {
        // 合并导入结果，如果有相同ID的则更新，否则添加
        const updated = [...prev]
        
        for (const importedDist of result.items) {
          if (importedDist.success) {
            const dist = importedDist.data
            const existingIndex = updated.findIndex(d => d.id === dist.id)
            
            if (existingIndex >= 0) {
              updated[existingIndex] = dist
            } else {
              updated.push(dist)
            }
          }
        }
        
        return updated
      })
      
      // 显示导入结果
      const successCount = result.items.filter(item => item.success).length
      const skipCount = result.skipped || 0
      const errorItems = result.items.filter(item => !item.success).map(item => item.message || '')
      
      // 显示导入结果弹窗
      showImportResultModal(successCount, skipCount, errorItems, 'distributor')
    } catch (error) {
      console.error('Distributor import processing failed:', error)
      message.error(t('admin.importFailed').replace('{errors}', (error as Error).message))
    } finally {
      setLoading(false)
    }
  }

  // 处理模板下载
  const handleDownloadDistributorTemplate = () => {
    generateDistributorImportTemplate()
  }

  // 处理分判商导出
  const handleDistributorExport = (all: boolean = false) => {
    const toExport = all 
      ? filteredDistributors 
      : filteredDistributors.filter(d => selectedDistributorIds.includes(d.id))
    
    if (toExport.length === 0) {
      message.warning(t('admin.noDistributorsToExport'))
      return
    }
    
    exportDistributorsToExcel(toExport, sites)
    setExportOptionsVisible(false)
  }

  // 显示导出选项
  const showDistributorExportOptions = () => {
    setExportOptionsVisible(true)
  }

  // 处理密码重置
  const handleResetPassword = (distributor: Distributor) => {
    Modal.confirm({
      title: t('admin.confirmResetPassword'),
      icon: <ExclamationCircleOutlined />,
      content: t('admin.confirmResetPasswordContent').replace('{name}', distributor.name),
      okText: t('admin.resetPassword'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          await apiService.resetDistributorPassword(distributor.id)
          message.success(t('messages.passwordResetSuccess'))
        } catch (error) {
          console.error('Password reset failed:', error)
          message.error(t('messages.passwordResetFailed'))
        }
      }
    })
  }

  // 切换分判商状态
  const handleToggleDistributorStatus = (distributor: Distributor) => {
    const newStatus = distributor.accountStatus === 'active' ? 'disabled' : 'active'
    const title = newStatus === 'active' 
      ? t('admin.confirmEnableDistributor')
      : t('admin.confirmDisableDistributor')
    const content = newStatus === 'active'
      ? t('admin.confirmEnableDistributorContent').replace('{name}', distributor.name)
      : t('admin.confirmDisableDistributorContent').replace('{name}', distributor.name)

    Modal.confirm({
      title,
      icon: <ExclamationCircleOutlined />,
      content,
      okText: newStatus === 'active' ? t('admin.enable') : t('admin.disable'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          // TODO: 使用正确的API
          await apiService.updateDistributor(distributor.id, { accountStatus: newStatus })
          
          setDistributors(prev => prev.map(d => d.id === distributor.id 
            ? { ...d, accountStatus: newStatus } 
            : d
          ))
          
          message.success(newStatus === 'active' 
            ? t('messages.distributorEnabled') 
            : t('messages.distributorDisabled')
          )
        } catch (error) {
          console.error('Failed to toggle distributor status:', error)
          message.error(t('messages.updateDistributorStatusFailed'))
        }
      }
    })
  }

  // 批量更改分判商状态
  const handleBatchUpdateDistributorStatus = () => {
    if (selectedDistributorIds.length === 0) {
      message.warning(t('admin.pleaseSelectDistributorsToUpdateStatus') || '请选择要修改状态的分判商')
      return
    }

    // 打开批量修改状态对话框
    if (setBatchUpdateStatusModalOpen && setBatchUpdateStatusType) {
      setBatchUpdateStatusModalOpen(true);
      setBatchUpdateStatusType('distributors');
    }
  }

  // 批量删除分判商
  const handleBatchDeleteDistributors = () => {
    if (selectedDistributorIds.length === 0) {
      message.warning(t('admin.pleaseSelectItemsToDelete'))
      return
    }
    
    Modal.confirm({
      title: t('admin.confirmBatchDeleteDistributors') || '确认批量删除',
      content: (t('admin.confirmBatchDeleteDistributorsContent') || '确认删除选中的{count}个分判商?').replace('{count}', selectedDistributorIds.length.toString()),
      icon: <ExclamationCircleOutlined />,
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          // 批量删除分判商
          const deletePromises = selectedDistributorIds.map(distributorId => {
            return apiService.deleteDistributor(distributorId)
          })
          
          await Promise.all(deletePromises)
          
          // 更新本地状态
          setDistributors(prev => prev.filter(distributor => !selectedDistributorIds.includes(distributor.id)))
          
          // 清除选择
          setSelectedDistributorIds([])
          
          message.success(t('admin.batchDeleteDistributorsSuccess') || '批量删除成功')
        } catch (error) {
          console.error('批量删除分判商失败:', error)
          message.error(t('admin.batchDeleteDistributorsFailed') || '批量删除失败')
        }
      }
    })
  }

  // 删除分判商
  const handleDeleteDistributor = (distributor: Distributor) => {
    Modal.confirm({
      title: t('admin.confirmDeleteDistributor'),
      icon: <ExclamationCircleOutlined />,
      content: t('admin.confirmDeleteDistributorContent').replace('{name}', distributor.name),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          await apiService.deleteDistributor(distributor.id)
          
          setDistributors(prev => prev.filter(d => d.id !== distributor.id))
          setSelectedDistributorIds(prev => prev.filter(id => id !== distributor.id))
          
          message.success(t('messages.distributorDeleted'))
        } catch (error) {
          console.error('Failed to delete distributor:', error)
          message.error(t('messages.deleteDistributorFailed'))
        }
      }
    })
  }

  // 显示导入结果模态框
  const showImportResultModal = (successCount: number, skipCount: number, errors: string[], type: string) => {
    Modal.success({
      title: t('admin.importResult'),
      content: (
        <div>
          <p>{t('admin.importSuccessCount').replace('{count}', successCount.toString())}</p>
          {skipCount > 0 && <p>{t('admin.importSkipCount').replace('{count}', skipCount.toString())}</p>}
          {errors.length > 0 && (
            <>
              <p>{t('admin.importErrors')}:</p>
              <ul style={{ maxHeight: '200px', overflow: 'auto' }}>
                {errors.map((error, index) => (
                  <li key={index} style={{ color: 'red' }}>{error}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      ),
      okText: t('common.ok'),
    })
  }

  // 处理邮件发送
  const handleSendEmails = async (all: boolean = false) => {
    if (!all && selectedDistributorIds.length === 0) {
      message.warning(t('admin.noDistributorsSelected'))
      return
    }

    try {
      const targetDistributors = all 
        ? filteredDistributors 
        : filteredDistributors.filter(d => selectedDistributorIds.includes(d.id))

      if (targetDistributors.length === 0) {
        message.warning(t('admin.noDistributorsToSendEmail'))
        return
      }

      // 显示进度模态框
      setEmailModalVisible(true)
      setEmailProgress(0)
      setEmailTotal(targetDistributors.length)
      setEmailSuccessCount(0)
      setEmailFailedItems([])

      // 发送邮件
      // 需要构造正确格式的数据，而不是简单的ID数组
      const currentLocale = 'zh-CN'; // 可以从useLocale获取，简化起见这里硬编码
      const loginUrl = window.location.origin + '/login'; // 登录URL
      
      let successCount = 0;
      let failedItems: FailedItem[] = [];
      
      // 处理进度更新
      const updateProgress = (current: number) => {
        const progress = Math.floor((current / targetDistributors.length) * 100);
        setEmailProgress(progress);
      };
      
      // 逐个发送邮件
      for (let i = 0; i < targetDistributors.length; i++) {
        const distributor = targetDistributors[i];
        
        try {
          // 为每个分判商构造数据
          const distributorData = {
            distributorEmail: distributor.email || '',
            distributorName: distributor.name || '',
            contactName: distributor.contactName || '',
            username: distributor.accountUsername || '',
            password: 'Pass@123', // 默认密码
            loginUrl: loginUrl,
            language: currentLocale
          };
          
          // 调用API发送邮件
          const result = await apiService.sendDistributorAccountEmail(distributorData);
          
          // 更新进度
          updateProgress(i + 1);
          
          // 处理结果
          if (result && result.success) {
            successCount++;
          } else if (distributor.email) {
            // 添加失败项
            failedItems.push({
              email: distributor.email,
              name: distributor.name || '',
              contactName: distributor.contactName || '',
              username: distributor.accountUsername || '',
              success: false,
              message: '发送失败'
            });
          }
        } catch (err) {
          console.error(`发送失败 ${distributor.name}:`, err);
          // 添加失败项
          if (distributor.email) {
            failedItems.push({
              email: distributor.email,
              name: distributor.name || '',
              contactName: distributor.contactName || '',
              username: distributor.accountUsername || '',
              success: false,
              message: err instanceof Error ? err.message : '未知错误'
            });
          }
        }
      }
      
      // 完成发送，设置最终进度
      setEmailProgress(100)
      setEmailSuccessCount(successCount)
      setEmailFailedItems(failedItems)
    } catch (error) {
      console.error('Failed to send emails:', error)
      message.error(t('messages.sendEmailsFailed'))
      setEmailModalVisible(false)
    }
  }

  // 重新发送失败的邮件
  const handleResendFailedEmails = async (selectedItems: FailedItem[]) => {
    if (selectedItems.length === 0) return

    try {
      setResendingEmails(true)
      
      // 准备重新发送的数据
      const itemsToResend = selectedItems.map(item => ({
        email: item.email,
        name: item.name,
        contactName: item.contactName,
        username: item.username
      }))
      
      // 调用API重新发送
      const loginUrl = window.location.origin + '/login';
      const currentLocale = 'zh-CN'; // 可以从useLocale获取
      
      // 发送邮件并处理结果
      const item = selectedItems[0];
      const distributorData = {
        distributorEmail: item.email || '',
        distributorName: item.name || '',
        contactName: item.contactName || '',
        username: item.username || '',
        password: 'Pass@123', // 默认密码
        loginUrl: loginUrl,
        language: currentLocale
      };
      
      // 调用API重发单个邮件
      const result = await apiService.sendDistributorAccountEmail(distributorData);
      
      // 更新成功状态
      message.success(t('messages.resendEmailsSuccess').replace('{count}', '1'));
      
      // 更新失败项列表
      setEmailFailedItems(prev => {
        // 从列表中移除已成功发送的邮件
        return prev.filter(item => item.email !== distributorData.distributorEmail);
      });
      
      // 更新成功计数
      setEmailSuccessCount(prev => prev + 1)
    } catch (error) {
      console.error('Failed to resend emails:', error)
      message.error(t('messages.resendEmailsFailed'))
    } finally {
      setResendingEmails(false)
    }
  }

  return (
    <>
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden',
        padding: '16px'
      }}>
        {/* 筛选和操作区域 */}
        <div style={{ 
          marginBottom: 16, 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          flexWrap: 'wrap',
          justifyContent: 'space-between'
        }}>
          <Row gutter={12} style={{ flex: 1 }}>
            <Col span={8}>
              <Input 
                placeholder={t('admin.distributorKeywordPlaceholder')} 
                value={distributorKeyword} 
                onChange={e => setDistributorKeyword(e.target.value)} 
                allowClear 
              />
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
                <Button size="small" icon={<DownloadOutlined />} onClick={handleDownloadDistributorTemplate}>
                  {t('admin.downloadTemplate')}
                </Button>
                <Upload
                  accept=".xlsx,.xls"
                  showUploadList={false}
                  beforeUpload={(file) => {
                    handleDistributorImport(file)
                    return false
                  }}
                >
                  <Button size="small" icon={<UploadOutlined />}>
                    {t('admin.importExcel')}
                  </Button>
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
          {!loading && (distributorStatusFilters.length > 0 || distributorKeyword.trim()) && (
            <div style={{ 
              padding: '8px 12px', 
              background: '#f5f5f5', 
              borderRadius: '4px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px'
            }}>
              <span style={{ color: '#666', fontSize: '12px' }}>
                {t('admin.filterResults').replace('{count}', filteredDistributors.length.toString())}
              </span>
              <Button 
                size="small" 
                onClick={() => {
                  setDistributorStatusFilters([])
                  setDistributorKeyword('')
                }}
              >
                {t('admin.clearFilter')}
              </Button>
            </div>
          )}
        </div>
        
        {/* 表格容器 */}
        <Card style={{ 
          margin: 0,
          height: 'calc(100vh - 300px)',
          display: 'flex', 
          flexDirection: 'column'
        }}
        styles={{
          body: {
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            padding: 0, 
            overflow: 'hidden'
          }
        }}>
          <div style={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* 选择状态显示 */}
            {selectedDistributorIds.length > 0 && (
              <div style={{ 
                marginBottom: 1,
                padding: '8px 16px', 
                backgroundColor: '#f6ffed', 
                border: '1px solid #b7eb8f',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0
              }}>
                <span>
                  {t('admin.selectedDistributors').replace('{count}', selectedDistributorIds.length.toString())}
                  {selectedDistributorIds.length > 0 && (
                    <span style={{ color: '#999', marginLeft: '8px' }}>
                      / {t('admin.totalDistributors').replace('{count}', filteredDistributors.length.toString())}
                    </span>
                  )}
                </span>
                <Space>
                  <Button 
                    size="small" 
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={() => handleSendEmails(false)}
                    title={t('common.asyncBatchSendEmailTitle') || '异步批量发送邮件'}
                  >
                    {t('common.asyncBatchSendToEmail') || '异步批量发送邮件'}({selectedDistributorIds.length})
                  </Button>
                  <Button 
                    size="small"
                    icon={<CheckCircleOutlined />} 
                    onClick={() => handleBatchUpdateDistributorStatus()}
                  >
                    {t('admin.batchUpdateDistributorStatus') || '批量修改状态'}({selectedDistributorIds.length})
                  </Button>
                  <Button 
                    size="small"
                    danger
                    icon={<DeleteOutlined />} 
                    onClick={handleBatchDeleteDistributors}
                  >
                    {t('admin.batchDeleteDistributors') || '批量删除'}({selectedDistributorIds.length})
                  </Button>
                  <Button 
                    onClick={() => setSelectedDistributorIds([])}
                    size="small"
                  >
                    {t('admin.clearSelection')}({selectedDistributorIds.length})
                  </Button>
                </Space>
              </div>
            )}
            
            {/* 表格 */}
            <div style={{ 
              flex: 1, 
              overflow: 'auto' 
            }}>
              <Table 
                dataSource={paginatedDistributors} 
                columns={distributorColumns} 
                rowKey="id"
                rowSelection={rowSelection}
                pagination={false}
                size="middle"
                loading={loading}
                scroll={{ x: 1500 }}
                onRow={record => ({
                  onClick: (event) => {
                    const target = event.target as HTMLElement;
                    
                    // 如果点击的是操作列中的按钮，不处理行点击
                    if (target.closest('button') || target.closest('.ant-btn')) {
                      return;
                    }
                    
                    // 切换选中状态
                    const isSelected = selectedDistributorIds.includes(record.id);
                    if (isSelected) {
                      setSelectedDistributorIds(prev => prev.filter(id => id !== record.id));
                    } else {
                      setSelectedDistributorIds(prev => [...prev, record.id]);
                    }
                  },
                  style: { cursor: 'pointer' }
                })}
              />
            </div>
            
            {/* 外部分页栏 */}
            <div style={{ 
              padding: '12px 16px',
              borderTop: '1px solid #f0f0f0',
              backgroundColor: '#fafafa',
              flexShrink: 0,
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center'
            }}>
              {/* 分页 */}
              <Pagination
                current={distributorPagination.current}
                pageSize={distributorPagination.pageSize}
                total={distributorPagination.total}
                showSizeChanger
                showQuickJumper
                showTotal={(total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`}
                pageSizeOptions={['10', '20', '50', '100']}
                onChange={handleDistributorPaginationChange}
                onShowSizeChange={handleDistributorPaginationChange}
                size="small"
                style={{ 
                  margin: 0
                }}
              />
            </div>
          </div>
        </Card>
      </div>
      
      {/* 分判商管理模态框 */}
      <Modal 
        title={editingDistributor ? t('admin.editDistributor') : t('admin.addDistributor')} 
        open={distributorModalOpen} 
        onCancel={() => { 
          setDistributorModalOpen(false); 
          setEditingDistributor(null);
        }} 
        onOk={onDistributorSubmit} 
        destroyOnClose
      >
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
          <Form.Item 
            name="email" 
            label={t('admin.emailLabel')} 
            rules={[
              { required: true, message: t('form.required') },
              { type: 'email', message: t('form.invalidEmail') }
            ]}
          >
            <Input placeholder={t('admin.emailPlaceholder')} />
          </Form.Item>
          <Form.Item name="whatsapp" label={t('admin.whatsAppLabel')}>
            <Input placeholder={t('admin.whatsAppPlaceholder')} />
          </Form.Item>
          {editingDistributor ? (
            <Form.Item name="accountUsername" label={t('admin.usernameLabel')}>
              <Input placeholder={t('admin.usernamePlaceholder')} />
            </Form.Item>
          ) : (
            <>
              <Form.Item 
                name="accountUsername" 
                label={t('admin.usernameLabel')} 
                rules={[{ required: true, message: t('form.required') }]}
              >
                <Input placeholder={t('admin.usernamePlaceholder')} />
              </Form.Item>
              <div style={{ 
                backgroundColor: '#fffbe6', 
                padding: '12px 16px', 
                borderRadius: '4px',
                marginBottom: '24px' 
              }}>
                <div style={{ color: '#d46b08', marginBottom: '8px' }}>
                  <ExclamationCircleOutlined style={{ marginRight: '8px' }} />
                  {t('admin.passwordNotice')}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {t('admin.distributorPasswordDescription')}
                </div>
              </div>
            </>
          )}
        </Form>
      </Modal>

      {/* 导出选项模态框 */}
      <Modal
        title={t('admin.exportOptions')}
        open={exportOptionsVisible}
        onCancel={() => setExportOptionsVisible(false)}
        footer={null}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Button 
            icon={<DownloadOutlined />}
            onClick={() => handleDistributorExport(true)}
            style={{ textAlign: 'left' }}
          >
            {t('admin.exportAllFiltered')} ({filteredDistributors.length})
          </Button>
          
          {selectedDistributorIds.length > 0 && (
            <Button 
              icon={<DownloadOutlined />}
              onClick={() => handleDistributorExport(false)}
              style={{ textAlign: 'left' }}
            >
              {t('admin.exportSelected')} ({selectedDistributorIds.length})
            </Button>
          )}
        </div>
      </Modal>

      {/* 邮件进度模态框 */}
      <SimpleEmailProgressModal
        visible={emailModalVisible}
        progress={emailProgress}
        successCount={emailSuccessCount}
        failedItems={emailFailedItems}
        total={emailTotal}
        onCancel={() => setEmailModalVisible(false)}
        failedItemsContent={
          <FailedDistributorItemsContent 
            failedItems={emailFailedItems}
            onResend={handleResendFailedEmails}
            loading={resendingEmails}
          />
        }
      />
    </>
  )
}

export default DistributorManagement
