import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Card, Table, Button, Space, Modal, Form, Input, Select, Tag, message, Row, Col, DatePicker, Pagination } from 'antd'

const { Option } = Select
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, DownloadOutlined, ExclamationCircleOutlined, CheckCircleOutlined, StopOutlined, QrcodeOutlined, MailOutlined, WhatsAppOutlined, ReloadOutlined } from '@ant-design/icons'

// 失败项内容组件，支持选择和重新发送
interface FailedItemsContentProps {
  failedItems: Array<{
    workerId: string;
    workerName: string;
    success: boolean;
    message?: string;
  }>;
  onResend: (selectedItems: Array<{
    workerId: string;
    workerName: string;
    success: boolean;
    message?: string;
  }>) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

const FailedItemsContent: React.FC<FailedItemsContentProps> = ({ failedItems, onResend, t }) => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // 表格行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys);
    }
  };

  // 处理重新发送
  const handleResend = () => {
    if (selectedRowKeys.length === 0) {
      message.warning(t('worker.pleaseSelectItemsToResend'));
      return;
    }

    const selectedItems = failedItems.filter(item => selectedRowKeys.includes(item.workerId));
    onResend(selectedItems);
  };

  // 全选
  const handleSelectAll = () => {
    setSelectedRowKeys(failedItems.map(item => item.workerId));
  };

  // 取消全选
  const handleDeselectAll = () => {
    setSelectedRowKeys([]);
  };

  return (
    <div>
      <p>{t('worker.sendFailureExplanation')}</p>
      
      {/* 操作工具栏 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button 
            size="small" 
            onClick={handleSelectAll}
          >
            {t('worker.selectAll')}
          </Button>
          <Button 
            size="small" 
            onClick={handleDeselectAll}
          >
            {t('worker.deselectAll')}
          </Button>
        </Space>

        <Button 
          type="primary" 
          icon={<ReloadOutlined />} 
          onClick={handleResend}
          disabled={selectedRowKeys.length === 0}
        >
          {t('worker.resendSelected')} ({selectedRowKeys.length})
        </Button>
      </div>

      <Table
        rowSelection={rowSelection}
        size="small"
        dataSource={failedItems}
        columns={[
          {
            title: t('worker.workerId'),
            dataIndex: 'workerId',
            key: 'workerId',
          },
          {
            title: t('worker.name'),
            dataIndex: 'workerName',
            key: 'workerName',
          },
          {
            title: t('common.error'),
            dataIndex: 'message',
            key: 'message',
          }
        ]}
        pagination={false}
        rowKey="workerId"
      />
    </div>
  );
};
import { Worker, CreateWorkerRequest, UpdateWorkerRequest, Site } from '../types/worker'
import { mockWorkers } from '../data/mockData'
import { 
  exportWorkersToExcel, 
  readWorkerExcelFile
} from '../utils/excelUtils'
import { useLocale } from '../contexts/LocaleContext'
import { useAuth } from '../hooks/useAuth'
import apiService from '../services/api'
import dayjs from 'dayjs'
import ExcelImportExportModal from '../components/ExcelImportExportModal'
import QRCodeModal from '../components/QRCodeModal'


// 表格样式
const tableStyles = `
  .ant-card-head {
    z-index: 1 !important;
    position: sticky !important;
    top: 0 !important;
    background: white !important;
  }
  .ant-card-head-title {
    z-index: 1 !important;
    background: white !important;
  }
  .ant-card-extra {
    z-index: 1 !important;
    background: white !important;
  }
`

const DistributorWorkerUpload: React.FC = () => {
  const { t } = useLocale()
  const { user } = useAuth()
  
  // 从用户信息中获取分判商信息
  const currentDistributor = user?.distributor || {
    id: 'default-distributor',
    name: '默认分判商',
    accountUsername: 'default'
  }

  // 工人管理状态
  const [workers, setWorkers] = useState<Worker[]>([])
  const [workerModalOpen, setWorkerModalOpen] = useState(false)
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null)
  const [workerForm] = Form.useForm()
  const [excelModalOpen, setExcelModalOpen] = useState(false)
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [qrCodeModalOpen, setQrCodeModalOpen] = useState(false)
  const [selectedWorkerForQR, setSelectedWorkerForQR] = useState<Worker | null>(null)
  const [sendingEmailLoading, setSendingEmailLoading] = useState(false)
  const [sendingWhatsAppLoading, setSendingWhatsAppLoading] = useState(false)
  
  // 工地数据状态
  const [sites, setSites] = useState<Site[]>([])
  const [sitesLoading, setSitesLoading] = useState(false)

  // 筛选状态
  const [statusFilters, setStatusFilters] = useState<string[]>([])
  const [siteFilter, setSiteFilter] = useState<string>('')
  const [keyword, setKeyword] = useState<string>('')
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // 加载工地数据
  const loadSites = useCallback(async () => {
    setSitesLoading(true)
    try {
      const sitesData = await apiService.getDistributorSites()
      setSites(sitesData)
    } catch (error) {
      console.error('加载工地数据失败:', error)
      message.error('加载工地数据失败')
    } finally {
      setSitesLoading(false)
    }
  }, [])

  // 状态映射函数
  const mapWorkerStatus = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'active'
      case 'INACTIVE': return 'inactive'
      default: return 'active'
    }
  }

  // 加载工人数据
  const loadWorkers = useCallback(async () => {
    setLoading(true)
    try {
      // 尝试从API获取数据
      const workersData = await apiService.getDistributorWorkers()
      // 映射状态格式
      const mappedWorkers = workersData.map(worker => ({
        ...worker,
        status: mapWorkerStatus(worker.status)
      }))
      setWorkers(mappedWorkers)
    } catch (error) {
      console.error('加载工人数据失败:', error)
      message.error(t('distributor.loadWorkersFailed'))
      // 降级到模拟数据
      setWorkers(mockWorkers.filter(w => w.distributorId === currentDistributor.id))
    } finally {
      setLoading(false)
    }
  }, [t, currentDistributor.id])

  // 组件挂载时加载数据
  useEffect(() => {
    loadWorkers()
    loadSites()
  }, [loadWorkers, loadSites])

  // 筛选后的工人数据
  const filteredWorkers = useMemo(() => {
    return workers.filter(worker => {
      // 状态筛选
      if (statusFilters.length > 0 && !statusFilters.includes(worker.status.toLowerCase())) return false
      
      // 工地筛选
      if (siteFilter && worker.siteId !== siteFilter) return false
      
      // 关键字筛选
      if (keyword.trim()) {
        const k = keyword.trim().toLowerCase()
        const text = `${worker.name || ''} ${worker.workerId || ''} ${worker.idNumber || ''}`.toLowerCase()
        if (!text.includes(k)) return false
      }
      return true
    })
  }, [workers, statusFilters, siteFilter, keyword])

  // 分页后的工人数据
  const paginatedWorkers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return filteredWorkers.slice(startIndex, endIndex)
  }, [filteredWorkers, currentPage, pageSize])

  // 分页处理函数
  const handlePageChange = (page: number, size?: number) => {
    setCurrentPage(page)
    if (size && size !== pageSize) {
      setPageSize(size)
    }
  }

  // 工人表单提交 - 使用本地状态更新方式保持工人记录在表格中的位置
  // 当使用loadWorkers()重新加载数据时，即使后端按创建时间排序，表格位置仍可能变化
  // 通过直接更新本地状态，可以避免记录位置变化，提高用户体验
  const onWorkerSubmit = async () => {
    try {
      const values = await workerForm.validateFields()
      setLoading(true)
      
      if (editingWorker) {
        // 编辑工人
        // 调用API更新工人信息
        await apiService.updateDistributorWorker(editingWorker.id, {
          name: values.name,
          phone: values.phone,
          idType: values.idType,
          idNumber: values.idNumber,
          gender: values.gender?.toUpperCase() as 'MALE' | 'FEMALE',
          status: values.status?.toUpperCase() as 'ACTIVE' | 'INACTIVE',
          region: values.region,
          siteId: values.siteId,
          birthDate: values.birthDate ? values.birthDate.toISOString() : null,
          email: values.email || null,
          whatsapp: values.whatsapp || null
        })
        
        // 直接更新本地状态，保持工人在列表中的位置不变
        setWorkers(prev => prev.map(w => 
          w.id === editingWorker.id 
            ? { 
                ...w, 
                name: values.name,
                phone: values.phone,
                idType: values.idType,
                idNumber: values.idNumber,
                gender: values.gender?.toUpperCase(),
                status: mapWorkerStatus(values.status?.toUpperCase() || 'ACTIVE'),
                region: values.region,
                siteId: values.siteId,
                site: w.site?.id === values.siteId ? w.site : sites.find(s => s.id === values.siteId),
                birthDate: values.birthDate ? values.birthDate.toISOString() : null,
                email: values.email || null,
                whatsapp: values.whatsapp || null,
                updatedAt: new Date().toISOString()
              }
            : w
        ))
        
        message.success(t('distributor.workerInfoUpdated'))
      } else {
        // 新增工人
        // 使用表单中选择的工地
        const selectedSiteId = values.siteId
        console.log('选择的工地ID:', selectedSiteId)
        console.log('分判商工地列表:', user?.distributor?.sites)
        console.log('分判商信息:', user?.distributor)
        
        if (!user?.distributor) {
          message.error('分判商信息获取失败，请重新登录')
          return
        }
        
        if (!selectedSiteId) {
          message.error('请选择工地')
          return
        }
        
        const createData: CreateWorkerRequest = {
          name: values.name,
          phone: values.phone,
          idType: values.idType,
          idNumber: values.idNumber,
          gender: values.gender?.toUpperCase() as 'MALE' | 'FEMALE',
          region: values.region || t('regions.mainland'),
          siteId: selectedSiteId, // 使用表单中选择的工地
          distributorId: currentDistributor?.id || 'default-distributor',
          status: (values.status?.toUpperCase() || 'ACTIVE') as 'ACTIVE' | 'INACTIVE',
          birthDate: values.birthDate ? values.birthDate.toISOString() : null,
          email: values.email || null,
          whatsapp: values.whatsapp || null
        }
        
        const newWorker = await apiService.createDistributorWorker(createData)
        message.success(t('distributor.workerInfoAdded'))
        
        // 将新创建的工人添加到本地工人列表头部，而不是重新加载全部数据
        // 确保新工人对象包含所有必要的Worker类型属性
        const processedWorker = {
          ...newWorker,
          status: mapWorkerStatus(newWorker.status),
          // 确保这些可选字段存在，即使为null
          region: newWorker.region || values.region || null,
          email: newWorker.email || values.email || null,
          whatsapp: newWorker.whatsapp || values.whatsapp || null
        };
        
        setWorkers(prev => [processedWorker, ...prev])
        
        // 显示二维码发送选项
        // 使用处理后的完整工人对象，确保包含所有必要属性
        setSelectedWorkerForQR(processedWorker)
        setQrCodeModalOpen(true)
      }
      
      // 不再重新加载数据，使用本地状态更新
      setWorkerModalOpen(false)
      setEditingWorker(null)
      workerForm.resetFields()
    } catch (error: unknown) {
      console.error('操作失败:', error)
      
      // 尝试获取具体的错误信息
      let errorMessage = t('distributor.operationFailed')
      
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMsg = (error as { message: string }).message
        
        // 检查是否是证件号码重复的错误
        if (errorMsg.includes('证件号码') || errorMsg.includes('idNumber') || errorMsg.includes('duplicate') || errorMsg.includes('已存在')) {
          errorMessage = '证件号码已存在，请检查证件号码是否正确或使用其他证件号码'
        } else if (errorMsg.includes('手机号') || errorMsg.includes('phone') || errorMsg.includes('电话')) {
          errorMessage = '手机号码已存在，请使用其他手机号码'
        } else if (errorMsg.includes('工号') || errorMsg.includes('workerId')) {
          errorMessage = '工人编号已存在，请使用其他工人编号或留空让系统自动分配'
        } else if (errorMsg.includes('网络') || errorMsg.includes('连接')) {
          errorMessage = '网络连接失败，请检查网络设置'
        } else if (errorMsg.includes('权限') || errorMsg.includes('permission')) {
          errorMessage = '没有权限执行此操作'
        } else if (errorMsg.includes('验证') || errorMsg.includes('validation')) {
          errorMessage = '输入信息验证失败，请检查输入内容'
        } else if (errorMsg && errorMsg !== '操作失败') {
          // 如果后端返回了具体的错误信息，直接使用
          errorMessage = errorMsg
        }
      }
      
      message.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // 删除工人 - 使用本地状态更新而非重新加载全部数据
  const handleDeleteWorker = (worker: Worker) => {
    Modal.confirm({
      title: t('distributor.confirmDelete'),
      icon: <ExclamationCircleOutlined />,
      content: t('distributor.confirmDeleteContent', { name: worker.name }),
      onOk: async () => {
        try {
          setLoading(true)
          await apiService.deleteDistributorWorker(worker.id)
          message.success(t('distributor.workerInfoDeleted'))
          
          // 直接从本地状态中移除被删除的工人，而不是重新加载数据
          setWorkers(prev => prev.filter(w => w.id !== worker.id))
        } catch (error) {
          console.error('删除工人失败:', error)
          message.error(t('distributor.operationFailed'))
        } finally {
          setLoading(false)
        }
      }
    })
  }




  // 切换工人状态
  const handleToggleStatus = async (worker: Worker) => {
    const newStatus = worker.status === 'active' ? 'inactive' : 'active'
    const backendStatus = newStatus === 'active' ? 'ACTIVE' : 'INACTIVE'
    
    try {
      // 调用后端API更新工人状态
      await apiService.updateDistributorWorker(worker.id, { status: backendStatus })
      
      // 更新本地状态
      setWorkers(prev => prev.map(w => 
        w.id === worker.id 
          ? { ...w, status: newStatus, updatedAt: new Date().toISOString() }
          : w
      ))
      
      // 显示成功消息
      message.success(t('distributor.workerStatusUpdated', { 
        status: newStatus === 'active' ? t('distributor.active') : t('distributor.inactive') 
      }))
    } catch (error) {
      console.error('更新工人状态失败:', error)
      message.error(t('distributor.operationFailed'))
    }
  }

  // 导出工人数据
  const handleExport = async (exportAll: boolean = true) => {
    const dataToExport = exportAll ? workers : workers.filter(worker => selectedWorkerIds.includes(worker.id))
    if (!exportAll && selectedWorkerIds.length === 0) {
      message.warning(t('distributor.pleaseSelectWorkersToExport'))
      return
    }
    
    try {
      // 分判商页面直接使用当前用户的分判商信息和已有的工人数据
      const currentDistributorInfo = user?.distributor ? [user.distributor] : []
      
      
      // 使用当前分判商信息进行导出
      exportWorkersToExcel(dataToExport, currentDistributorInfo, sites)
      message.success(t('distributor.exportedWorkers', { count: dataToExport.length.toString() }))
    } catch (error) {
      console.error('导出失败:', error)
      message.error('导出失败，请重试')
    }
  }


  // 导入工人数据
  const handleImport = async (file: File) => {
    setLoading(true)
    try {
      const { workers: importedWorkers, errors } = await readWorkerExcelFile(file, undefined, undefined, t, workers)
      
      if (errors.length > 0) {
        message.error(t('distributor.importFailed', { errors: errors.join('; ') }))
        return
      }
      
      if (importedWorkers.length === 0) {
        message.warning('Excel文件中没有找到有效的工人数据，请检查文件格式和内容')
        return
      }
      
      // 显示导入确认对话框
      Modal.confirm({
        title: t('distributor.importConfirm'),
        content: (
          <div>
            <p>{t('distributor.importConfirmMessage', { count: importedWorkers.length.toString() })}</p>
            <p style={{ color: '#1890ff', marginTop: '8px' }}>
              {t('distributor.importDefaultSiteMessage', { siteName: sites.length > 0 ? sites[0].name : t('distributor.noSiteSelected') })}
            </p>
            <p style={{ color: '#666', fontSize: '12px', marginTop: '8px' }}>
              {t('distributor.importRulesMessage')}
            </p>
          </div>
        ),
        onOk: async () => {
          await processWorkerImport(importedWorkers)
        }
      })
    } catch (error) {
      console.error('导入失败:', error)
      message.error(t('distributor.importError', { error: error.message }))
    } finally {
      setLoading(false)
    }
  }

  // 处理工人导入 - 直接上传Excel文件
  const processWorkerImport = async (file: File | any[]) => {
    try {
      setLoading(true)
      
      let result;
      
      // 判断输入类型
      if (file instanceof File) {
        // 直接上传Excel文件给后端处理
        console.log(`准备上传Excel文件: ${file.name}`)
        result = await apiService.importDistributorWorkersFromExcel(file)
      } else {
        // 处理已解析的工人数据（兼容旧逻辑）
        console.log(`准备批量导入 ${file.length} 个工人`)
        result = await apiService.importDistributorWorkers(file)
      }
      
      // 刷新工人列表
      await loadWorkers()
      
      // 显示导入结果
      showWorkerImportResultModal(result.success, result.skipped, result.errorDetails || [])
      
    } catch (error) {
      console.error('Import processing failed:', error)
      message.error(t('distributor.importFailed'))
    } finally {
      setLoading(false)
    }
  }

  // 显示工人导入结果弹窗 - 与dashboard页面保持一致
  const showWorkerImportResultModal = (successCount: number, skipCount: number, errors: string[]) => {
    const totalCount = successCount + skipCount + errors.length
    
    Modal.info({
      title: t('worker.importResultTitle'),
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
                {t('worker.importCompleted')}
              </span>
            </div>
            <div style={{ color: '#666', fontSize: '14px' }}>
              {t('worker.importTotalProcessed').replace('{total}', totalCount.toString())}
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
                {t('worker.importSuccessCount')}
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
                {t('worker.importSkipCount')}
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
                {t('worker.importErrorCount')}
              </div>
            </div>
          </div>

          {/* 跳过原因详情 */}
          {skipCount > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ 
                color: '#fa8c16', 
                fontWeight: 'bold', 
                marginBottom: '8px',
                fontSize: '14px'
              }}>
                {t('worker.importSkipReasons')}:
              </div>
              <div style={{ 
                background: '#fff7e6', 
                border: '1px solid #ffd591', 
                borderRadius: '4px', 
                padding: '12px'
              }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ color: '#666', fontSize: '12px' }}>
                    <span style={{ fontWeight: 'bold' }}>身份证重复:</span> {skipCount} 条
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 错误汇总 - 只显示一条失败信息 */}
          {errors.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ 
                background: '#fff2f0', 
                border: '1px solid #ffccc7', 
                borderRadius: '6px', 
                padding: '12px',
                textAlign: 'center'
              }}>
                <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: '16px', marginRight: '8px' }} />
                <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
                  {t('worker.importErrorSummary', { count: errors.length.toString() })}
                </span>
              </div>
            </div>
          )}

          {/* 成功提示 - 当没有错误时显示 */}
          {errors.length === 0 && successCount > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ 
                background: '#f6ffed', 
                border: '1px solid #b7eb8f', 
                borderRadius: '6px', 
                padding: '12px',
                textAlign: 'center'
              }}>
                <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '16px', marginRight: '8px' }} />
                <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
                  {t('worker.importSuccessMessage', { count: successCount.toString() })}
                </span>
              </div>
            </div>
          )}
        </div>
      ),
      okText: t('common.ok')
    })
  }

  // 从ExcelImportExportModal导入工人数据
  const handleImportFromModal = async (importedWorkers: CreateWorkerRequest[]) => {
    await processWorkerImport(importedWorkers)
  }
  
  // 批量发送二维码（邮件或WhatsApp）
  const handleBatchSendQRCode = async (method: 'email' | 'whatsapp') => {
    if (selectedWorkerIds.length === 0) {
      message.warning(t('worker.pleaseSelectWorkersToSend'))
      return
    }

    const selectedWorkers = workers.filter(worker => selectedWorkerIds.includes(worker.id))
    
    // 处理电子邮件发送
    if (method === 'email') {
      // 检查是否所有选中的工人都有电子邮件地址
      const workersWithoutEmail = selectedWorkers.filter(w => !w.email)
      if (workersWithoutEmail.length > 0) {
        message.warning(t('worker.noValidEmailWarning'))
        return
      }
      
      // 显示加载中的消息
      const loadingKey = 'sendingQRCodesEmail'
      message.loading({ 
        content: t('worker.sendingQRCodes', { count: String(selectedWorkers.length) }), 
        key: loadingKey 
      })
      
      try {
        setSendingEmailLoading(true)
        
        // 生成二维码并准备批量发送数据
        const workerDataPromises = selectedWorkers.map(async worker => {
          try {
            // 获取工人的二维码数据
            const qrCodeData = await apiService.generateWorkerQRCode(worker.id)
            if (!qrCodeData || !qrCodeData.qrCodeDataUrl) {
              throw new Error(t('qrcode.generateFailed'))
            }
            
            return {
              workerEmail: worker.email,
              workerName: worker.name,
              workerId: worker.workerId,
              qrCodeDataUrl: qrCodeData.qrCodeDataUrl
            }
          } catch (err) {
            console.error(`生成工人[${worker.name}]的二维码失败:`, err)
            return null
          }
        })
        
        // 等待所有二维码生成完成
        const workerDataResults = await Promise.all(workerDataPromises)
        const validWorkerData = workerDataResults.filter(data => data !== null)
        
        if (validWorkerData.length === 0) {
          message.error({ content: t('qrcode.allGenerationFailed'), key: loadingKey })
          return
        }
        
        // 获取当前的语言设置
        const currentLocale = localStorage.getItem('locale') || 'zh-CN'
        
        // 分批发送，避免请求过大
        const BATCH_SIZE = 10; // 每批10个工人
        let successCount = 0;
        let failedCount = 0;
        let allFailedItems: any[] = [];
        
        // 将工人数据分成多个批次
        const batches = [];
        for (let i = 0; i < validWorkerData.length; i += BATCH_SIZE) {
          batches.push(validWorkerData.slice(i, i + BATCH_SIZE));
        }
        
        // 显示批次信息
        message.info({ 
          content: t('worker.batchProcessingInfo', { 
            batches: String(batches.length), 
            total: String(validWorkerData.length)
          }) || `将分${batches.length}批处理${validWorkerData.length}个工人数据`,
          key: loadingKey 
        });
        
        // 逐批处理
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          
          // 更新加载消息
          message.loading({ 
            content: `处理第${i+1}/${batches.length}批 (${batch.length}个工人)`, 
            key: loadingKey 
          });
          
          // 批量发送二维码邮件
          const result = await apiService.batchSendQRCodeEmail({
            workers: batch,
            language: currentLocale
          })
        
          if (result.success) {
            // 累加成功数量
            successCount += (result.results?.succeeded || 0);
            
            // 收集失败项
            if (result.results && result.results.failed > 0) {
              const batchFailedItems = result.results.details.filter(item => !item.success);
              allFailedItems = [...allFailedItems, ...batchFailedItems];
              failedCount += result.results.failed;
            }
            
            // 更新进度消息
            message.loading({ 
              content: `已完成${i+1}/${batches.length}批，成功${successCount}个，失败${failedCount}个`, 
              key: loadingKey 
            });
          } else {
            // 整批失败
            message.error({ 
              content: `第${i+1}批发送失败: ${result.message || t('worker.batchSendFailed')}`, 
              key: loadingKey 
            });
            failedCount += batch.length;
          }
        }
        
        // 所有批次处理完毕，显示最终结果
        if (failedCount === 0) {
          // 全部成功
          message.success({ 
            content: t('worker.batchSendComplete', { 
              count: String(successCount),
              total: String(validWorkerData.length)
            }),
            key: loadingKey
          });
          
          // 批量发送成功后清除选择
          setSelectedWorkerIds([]);
        } else {
          // 部分失败，显示失败项
          message.info({ 
            content: `发送完成: ${successCount}个成功，${failedCount}个失败`, 
            key: loadingKey 
          });
          
          // 创建一个可选择的Modal对话框
          const failedModal = Modal.warning({
            title: t('worker.partialSendFailure', { 
              failed: String(failedCount),
              total: String(validWorkerData.length)
            }),
            content: (
              <FailedItemsContent 
                failedItems={allFailedItems}
                onResend={async (selectedItems) => {
                  // 关闭当前对话框
                  failedModal.destroy();
                  
                  // 如果没有选择任何项，直接返回
                  if (!selectedItems || selectedItems.length === 0) {
                    return;
                  }
                  
                  // 显示正在重新发送的消息
                  const resendKey = 'resendingEmails';
                  message.loading({ 
                    content: t('worker.resendingEmails', { count: String(selectedItems.length) }),
                    key: resendKey
                  });
                  
                  try {
                    // 为所选项重新生成二维码并发送
                    const selectedWorkers = workers.filter(worker => 
                      selectedItems.some(item => item.workerId === worker.workerId)
                    );
                    
                    // 生成二维码并准备批量发送数据
                    const workerDataPromises = selectedWorkers.map(async worker => {
                      try {
                        // 获取工人的二维码数据
                        const qrCodeData = await apiService.generateWorkerQRCode(worker.id);
                        if (!qrCodeData || !qrCodeData.qrCodeDataUrl) {
                          throw new Error(t('qrcode.generateFailed'));
                        }
                        
                        return {
                          workerEmail: worker.email,
                          workerName: worker.name,
                          workerId: worker.workerId,
                          qrCodeDataUrl: qrCodeData.qrCodeDataUrl
                        };
                      } catch (err) {
                        console.error(`生成工人[${worker.name}]的二维码失败:`, err);
                        return null;
                      }
                    });
                    
                    // 等待所有二维码生成完成
                    const workerDataResults = await Promise.all(workerDataPromises);
                    const validWorkerData = workerDataResults.filter(data => data !== null);
                    
                    if (validWorkerData.length === 0) {
                      message.error({ 
                        content: t('qrcode.allGenerationFailed'), 
                        key: resendKey 
                      });
                      return;
                    }
                    
                    // 对于重发的项目也要分批处理，避免请求过大
                    const RESEND_BATCH_SIZE = 10;
                    let resendSuccessCount = 0;
                    let resendFailedCount = 0;
                    let resendFailedItems: any[] = [];
                    
                    // 将要重发的数据分批
                    const resendBatches = [];
                    for (let i = 0; i < validWorkerData.length; i += RESEND_BATCH_SIZE) {
                      resendBatches.push(validWorkerData.slice(i, i + RESEND_BATCH_SIZE));
                    }
                    
                    // 显示批次信息
                    message.info({ 
                      content: `将分${resendBatches.length}批重发${validWorkerData.length}个工人数据`,
                      key: resendKey 
                    });
                    
                    // 逐批处理重发
                    for (let i = 0; i < resendBatches.length; i++) {
                      const batch = resendBatches[i];
                      
                      // 获取当前的语言设置
                      const currentLocale = localStorage.getItem('locale') || 'zh-CN';
                      
                      // 更新重发进度
                      message.loading({ 
                        content: `重发进度: ${i+1}/${resendBatches.length}批`, 
                        key: resendKey 
                      });
                      
                      // 批量重发
                      const resendResult = await apiService.batchSendQRCodeEmail({
                        workers: batch,
                        language: currentLocale
                      });
                      
                      if (resendResult.success) {
                        resendSuccessCount += (resendResult.results?.succeeded || 0);
                        
                        if (resendResult.results && resendResult.results.failed > 0) {
                          const batchFailedItems = resendResult.results.details.filter(item => !item.success);
                          resendFailedItems = [...resendFailedItems, ...batchFailedItems];
                          resendFailedCount += resendResult.results.failed;
                        }
                      } else {
                        resendFailedCount += batch.length;
                      }
                    }
                    
                    // 显示重发最终结果
                    if (resendFailedCount === 0) {
                      message.success({ 
                        content: t('worker.resendComplete', { 
                          count: String(resendSuccessCount),
                          total: String(validWorkerData.length)
                        }),
                        key: resendKey
                      });
                    } else {
                      message.info({ 
                        content: `重发完成: ${resendSuccessCount}个成功，${resendFailedCount}个失败`, 
                        key: resendKey 
                      });
                      
                      // 显示重发失败项
                      Modal.warning({
                        title: t('worker.resendPartialFailure', { 
                          failed: String(resendFailedCount),
                          total: String(validWorkerData.length)
                        }),
                        content: (
                          <div>
                            <p>{t('worker.resendFailureExplanation')}</p>
                            <Table
                              size="small"
                              dataSource={resendFailedItems}
                              columns={[
                                {
                                  title: t('worker.workerId'),
                                  dataIndex: 'workerId',
                                  key: 'workerId',
                                },
                                {
                                  title: t('worker.name'),
                                  dataIndex: 'workerName',
                                  key: 'workerName',
                                },
                                {
                                  title: t('common.error'),
                                  dataIndex: 'message',
                                  key: 'message',
                                }
                              ]}
                              pagination={false}
                              rowKey="workerId"
                            />
                          </div>
                        ),
                        okText: t('common.ok'),
                        width: 600,
                      });
                    }
                  } catch (error) {
                    console.error('重新发送二维码邮件失败:', error);
                    message.error({ 
                      content: typeof error === 'string' ? error : t('worker.resendFailed'),
                      key: resendKey
                    });
                  }
                }}
                t={t}
              />
            ),
            okText: t('common.ok'),
            width: 700,
          });
        }
      } catch (error) {
        console.error('批量发送二维码邮件失败:', error)
        message.error({ 
          content: typeof error === 'string' ? error : t('worker.batchSendFailed'), 
          key: loadingKey 
        })
      } finally {
        setSendingEmailLoading(false)
      }
    } 
    // WhatsApp发送处理
    else if (method === 'whatsapp') {
      try {
        setSendingWhatsAppLoading(true)
        
        const workersWithoutWhatsApp = selectedWorkers.filter(w => !w.whatsapp)
        if (workersWithoutWhatsApp.length > 0) {
          message.warning(t('worker.noValidWhatsappWarning'))
          return
        }
        
        // 这里可以实现WhatsApp发送逻辑
        message.info(t('worker.whatsAppSendingNotImplemented'))
      } finally {
        setSendingWhatsAppLoading(false)
      }
    }
  }

  // 工人表格列定义
  const workerColumns = [
    { title: t('distributor.workerId'), dataIndex: 'workerId', key: 'workerId', width: 120, fixed: 'left' as const, ellipsis: true, sorter: (a: Worker, b: Worker) => a.workerId.localeCompare(b.workerId) },
    { title: t('distributor.name'), dataIndex: 'name', key: 'name', width: 100, fixed: 'left' as const, ellipsis: true, sorter: (a: Worker, b: Worker) => a.name.localeCompare(b.name) },
    { title: t('distributor.gender'), dataIndex: 'gender', key: 'gender', width: 80, render: (gender: string) => getGenderTag(gender), ellipsis: true, sorter: (a: Worker, b: Worker) => a.gender.localeCompare(b.gender) },
    { 
      title: t('distributor.birthDate'), 
      dataIndex: 'birthDate', 
      key: 'birthDate', 
      width: 120, 
      render: (d?: string) => {
        if (!d) return '-';
        try {
          return dayjs(d).format('YYYY-MM-DD');
        } catch (error) {
          return d;
        }
      }, 
      ellipsis: true, 
      sorter: (a: Worker, b: Worker) => (a.birthDate || '').localeCompare(b.birthDate || '') 
    },
    { 
      title: t('distributor.age'), 
      dataIndex: 'age', 
      key: 'age', 
      width: 80, 
      render: (age: number, record: Worker) => {
        if (record.birthDate) {
          const birthDate = dayjs(record.birthDate);
          const now = dayjs();
          let calculatedAge = now.year() - birthDate.year();
          if (now.month() < birthDate.month() || (now.month() === birthDate.month() && now.date() < birthDate.date())) {
            calculatedAge -= 1;
          }
          return Math.max(calculatedAge, 0);
        }
        return '-';
      }, 
      ellipsis: true, 
      sorter: (a: Worker, b: Worker) => {
        const ageA = a.birthDate ? (() => {
          const birthDate = dayjs(a.birthDate);
          const now = dayjs();
          let age = now.year() - birthDate.year();
          if (now.month() < birthDate.month() || (now.month() === birthDate.month() && now.date() < birthDate.date())) {
            age -= 1;
          }
          return Math.max(age, 0);
        })() : 0;
        const ageB = b.birthDate ? (() => {
          const birthDate = dayjs(b.birthDate);
          const now = dayjs();
          let age = now.year() - birthDate.year();
          if (now.month() < birthDate.month() || (now.month() === birthDate.month() && now.date() < birthDate.date())) {
            age -= 1;
          }
          return Math.max(age, 0);
        })() : 0;
        return ageA - ageB;
      }
    },
    {
      title: t('worker.idType'),
      dataIndex: 'idType',
      key: 'idType',
      width: 120,
      render: (idType: string) => {
        const typeMap: Record<string, string> = {
          'ID_CARD': t('worker.idCard'),
          'PASSPORT': t('worker.passport'),
          'DRIVER_LICENSE': t('worker.driverLicense'),
          'OTHER': t('worker.other')
        };
        return typeMap[idType] || idType;
      },
    },
    {
      title: t('worker.idNumber'),
      dataIndex: 'idNumber',
      key: 'idNumber',
      width: 180,
      sorter: (a: Worker, b: Worker) => a.idNumber.localeCompare(b.idNumber),
    },
    { 
      title: t('distributor.region'), 
      dataIndex: 'region', 
      key: 'region', 
      width: 100, 
      ellipsis: true, 
      sorter: (a: Worker, b: Worker) => a.region.localeCompare(b.region),
      render: (region: string) => region || '-'
    },
    { 
      title: t('distributor.site'), 
      dataIndex: 'siteId', 
      key: 'siteId', 
      width: 150, 
      render: (siteId: string, record: Worker) => {
        // 优先使用worker对象中已包含的site信息
        const site = record.site || sites.find(s => s.id === siteId);
        return site?.name || siteId || '-';
      }, 
      ellipsis: true, 
      sorter: (a: Worker, b: Worker) => {
        const siteA = a.site || sites.find(s => s.id === a.siteId);
        const siteB = b.site || sites.find(s => s.id === b.siteId);
        return (siteA?.name || a.siteId || '').localeCompare(siteB?.name || b.siteId || '');
      }
    },
    { title: t('distributor.phone'), dataIndex: 'phone', key: 'phone', width: 130, ellipsis: true, sorter: (a: Worker, b: Worker) => a.phone.localeCompare(b.phone) },
    { title: t('distributor.email'), dataIndex: 'email', key: 'email', width: 180, ellipsis: true, sorter: (a: Worker, b: Worker) => a.email.localeCompare(b.email) },
    { title: t('distributor.whatsapp'), dataIndex: 'whatsapp', key: 'whatsapp', width: 130, render: (whatsapp: string) => {
      if (!whatsapp) return '-';
      const parts = whatsapp.split(' ');
      if (parts.length === 2) {
        return (
          <div style={{ lineHeight: '1.2' }}>
            <span style={{ color: '#666' }}>{parts[0]}</span> <span>{parts[1]}</span>
          </div>
        );
      }
      return whatsapp;
    }, ellipsis: true, sorter: (a: Worker, b: Worker) => (a.whatsapp || '').localeCompare(b.whatsapp || '') },
    { title: t('distributor.status'), dataIndex: 'status', key: 'status', width: 100, render: (status: string) => getStatusTag(status), ellipsis: true, sorter: (a: Worker, b: Worker) => a.status.localeCompare(b.status) },
    { title: t('common.actions'), key: 'actions', width: 150, fixed: 'right' as const, ellipsis: true, render: (_: unknown, record: Worker) => (
      <Space style={{ justifyContent: 'flex-end' }}>
        <Button 
          size="small" 
          icon={<EditOutlined />} 
          onClick={() => { 
            setEditingWorker(record)
            workerForm.setFieldsValue({
              ...record,
              workerId: record.workerId, // 确保工号被设置
              idType: record.idType, // 设置证件类型
              idNumber: record.idNumber, // 设置证件号码
              birthDate: record.birthDate ? dayjs(record.birthDate) : undefined,
              siteId: record.siteId, // 确保工地ID被设置
              region: record.region // 直接使用数据库原始值
            })
            setWorkerModalOpen(true) 
          }}
          title={t('common.edit')}
        />
        <Button 
          size="small" 
          icon={<QrcodeOutlined />} 
          onClick={() => {
            setSelectedWorkerForQR(record)
            setQrCodeModalOpen(true)
          }}
          title={t('distributor.sendQRCode')}
        />
        <Button 
          size="small" 
          type="primary"
          danger={record.status === 'active'}
          icon={record.status === 'active' ? <StopOutlined /> : <CheckCircleOutlined />} 
          onClick={() => handleToggleStatus(record)}
          title={record.status === 'active' ? t('distributor.pause') : t('distributor.enable')}
        />
        <Button 
          size="small" 
          danger 
          icon={<DeleteOutlined />} 
          onClick={() => handleDeleteWorker(record)}
          title={t('common.delete')}
        />
      </Space>
    ) }
  ]

  // 获取性别标签
  const getGenderTag = (gender: string) => {
    const map: Record<string, { color: string; text: string }> = { 
      male: { color: 'blue', text: t('distributor.male') }, 
      female: { color: 'pink', text: t('distributor.female') },
      MALE: { color: 'blue', text: t('distributor.male') }, 
      FEMALE: { color: 'pink', text: t('distributor.female') }
    }
    const cfg = map[gender] || { color: 'default', text: gender || '-' }
    return <Tag color={cfg.color}>{cfg.text}</Tag>
  }

  // 获取状态标签
  const getStatusTag = (status: string) => {
    const map: Record<string, { color: string; text: string }> = { 
      active: { color: 'green', text: t('distributor.active') }, 
      inactive: { color: 'red', text: t('distributor.inactive') },
      ACTIVE: { color: 'green', text: t('distributor.active') }, 
      INACTIVE: { color: 'red', text: t('distributor.inactive') }
    }
    const cfg = map[status] || { color: 'default', text: status || '-' }
    return <Tag color={cfg.color}>{cfg.text}</Tag>
  }


  // 行选择配置
  const rowSelection = {
    selectedRowKeys: selectedWorkerIds,
    onChange: (selectedRowKeys: React.Key[]) => {
      // 获取当前页面的所有工人ID
      const currentPageWorkerIds = paginatedWorkers.map(w => w.id)
      
      // 移除当前页面的所有选中项
      const otherPageSelections = selectedWorkerIds.filter(id => !currentPageWorkerIds.includes(id))
      
      // 添加当前页面的新选中项
      const newSelections = [...otherPageSelections, ...(selectedRowKeys as string[])]
      
      setSelectedWorkerIds(newSelections)
    },
    onSelectAll: (selected: boolean) => {
      if (selected) {
        // 全选当前页面
        const currentPageWorkerIds = paginatedWorkers.map(w => w.id)
        const otherPageSelections = selectedWorkerIds.filter(id => !currentPageWorkerIds.includes(id))
        setSelectedWorkerIds([...otherPageSelections, ...currentPageWorkerIds])
      } else {
        // 取消全选当前页面
        const currentPageWorkerIds = paginatedWorkers.map(w => w.id)
        setSelectedWorkerIds(selectedWorkerIds.filter(id => !currentPageWorkerIds.includes(id)))
      }
    },
    getCheckboxProps: (record: Worker) => ({
      name: record.name,
    }),
  }

  return (
    <div style={{ 
      height: 'calc(100vh - 64px)', 
      display: 'flex', 
      flexDirection: 'column',
      padding: 0,
      overflow: 'hidden'
    }}>
      {/* 添加样式来修复表格固定列覆盖header的问题 */}
      <style>{tableStyles}</style>
      

      {/* 工人管理表格 */}
      <Card 
        title={`${t('distributor.workerInfoManagement')} (${workers.length})`}
        extra={
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {/* 筛选器 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Input.Search
                placeholder={t('distributor.searchWorkerPlaceholder')}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                allowClear
                style={{ width: 200 }}
              />
              <Select
                mode="multiple"
                style={{ width: 120 }}
                placeholder={t('distributor.statusFilter')}
                value={statusFilters}
                onChange={setStatusFilters}
                options={[
                  { value: 'active', label: t('distributor.active') },
                  { value: 'inactive', label: t('distributor.inactive') }
                ]}
                allowClear
                maxTagCount="responsive"
                maxTagTextLength={2}
                dropdownStyle={{ maxHeight: 200, overflow: 'auto' }}
              />
              <Select
                style={{ width: 150 }}
                placeholder={t('worker.siteFilter')}
                value={siteFilter}
                onChange={(value) => setSiteFilter(value)}
                options={sites.map(site => ({ value: site.id, label: site.name }))}
                allowClear
                loading={sitesLoading}
                dropdownStyle={{ maxHeight: 300, overflow: 'auto' }}
              />
            </div>
            
            {/* 操作按钮 */}
            <Space>
              <Button 
                icon={<UploadOutlined />} 
                onClick={() => setExcelModalOpen(true)}
              >
                {t('distributor.excelImport')}
              </Button>
              <Button 
                icon={<DownloadOutlined />} 
                onClick={() => handleExport(selectedWorkerIds.length === 0)}
              >
                {selectedWorkerIds.length === 0 ? t('distributor.exportAll') : `${t('distributor.exportSelected')}(${selectedWorkerIds.length})`}
              </Button>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={() => { 
                  setEditingWorker(null)
                  workerForm.resetFields()
                  // 设置新增工人的默认值
                  const defaultSiteId = sites.length > 0 ? sites[0].id : null
                  workerForm.setFieldsValue({
                    status: 'active',
                    idType: 'ID_CARD', // 设置默认证件类型为身份证
                    region: t('regions.mainland'),
                    siteId: defaultSiteId, // 设置默认工地为第一个工地
                    birthDate: null, // 初始日期为空
                    email: '', // 初始邮箱为空
                    whatsapp: '' // 初始WhatsApp为空
                  })
                  setWorkerModalOpen(true) 
                }}
              >
                {t('distributor.addWorker')}
              </Button>
            </Space>
          </div>
        }
        style={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          margin: 0,
          borderRadius: 0
        }}
        styles={{
          body: {
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            padding: 0, 
            overflow: 'hidden',
            margin: 0
          }
        }}
        headStyle={{
          padding: '12px 16px',
          margin: 0,
          borderBottom: '1px solid #f0f0f0',
          position: 'sticky',
          top: '64px',
          zIndex: 1,
          backgroundColor: 'white'
        }}
      >

        {/* 工人表格 */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          minHeight: 0, 
          padding: '2px 16px 0 16px',
          overflow: 'hidden'
        }}>
          <Table
            rowSelection={rowSelection}
            columns={workerColumns}
            dataSource={paginatedWorkers}
            rowKey="id"
            loading={loading}
            scroll={{ 
              x: 1800,
              y: 'calc(100vh - 240px)'
            }}
            pagination={false}
            style={{ 
              fontSize: '14px'
            }}
          />
        </div>

        {/* 外部分页栏 */}
        <div style={{ 
          padding: '12px 8px',
          borderTop: '1px solid #f0f0f0',
          backgroundColor: '#fafafa',
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {/* 选择状态显示 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: '#666', fontSize: '14px' }}>
              {t('distributor.selectedWorkers', { count: selectedWorkerIds.length.toString() })}
              {selectedWorkerIds.length > 0 && (
                <span style={{ color: '#999', marginLeft: '8px' }}>
                  / {t('distributor.totalWorkers', { count: filteredWorkers.length.toString() })}
                </span>
              )}
            </span>
            {selectedWorkerIds.length > 0 && (
              <>
                <Space>
                  <Button
                    size="small"
                    type="primary"
                    icon={<MailOutlined />}
                    onClick={() => handleBatchSendQRCode('email')}
                    loading={sendingEmailLoading}
                  >
                    {t('worker.batchSendToEmail')}
                  </Button>
                  <Button
                    size="small"
                    type="primary"
                    icon={<WhatsAppOutlined />}
                    onClick={() => handleBatchSendQRCode('whatsapp')}
                    loading={sendingWhatsAppLoading}
                  >
                    {t('worker.batchSendToWhatsApp')}
                  </Button>
                  <Button 
                    size="small" 
                    onClick={() => setSelectedWorkerIds([])}
                  >
                    {t('distributor.clearSelection')}
                  </Button>
                </Space>
              </>
            )}
            {selectedWorkerIds.length < filteredWorkers.length && (
              <Button 
                size="small" 
                type="primary"
                onClick={() => setSelectedWorkerIds(filteredWorkers.map(w => w.id))}
              >
                {t('distributor.selectAllPages')}
              </Button>
            )}
          </div>
          
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={filteredWorkers.length}
            showSizeChanger
            showQuickJumper
            showTotal={(total, range) => 
              t('distributor.pageInfo', { start: range[0].toString(), end: range[1].toString(), total: total.toString() })
            }
            pageSizeOptions={['10', '20', '50', '100']}
            onChange={handlePageChange}
            onShowSizeChange={handlePageChange}
            style={{ 
              margin: 0
            }}
          />
        </div>
      </Card>

      {/* 工人信息模态框 */}
      <Modal
        title={editingWorker ? t('distributor.editWorkerInfo') : t('distributor.addWorkerInfo')}
        open={workerModalOpen}
        onCancel={() => {
          setWorkerModalOpen(false)
          setEditingWorker(null)
          workerForm.resetFields()
        }}
        onOk={onWorkerSubmit}
        destroyOnClose
        width={800}
      >
        <Form form={workerForm} layout="vertical">
          {/* 工号单独一行 */}
          {editingWorker && (
            <Form.Item name="workerId" label={t('distributor.workerId')} rules={[{ required: true, message: t('distributor.pleaseEnterWorkerId') }]}>
              <Input placeholder={t('distributor.workerIdPlaceholder')} disabled />
            </Form.Item>
          )}
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label={t('distributor.name')} rules={[{ required: true, message: t('distributor.pleaseEnterName') }]}>
                <Input placeholder={t('distributor.namePlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="siteId" label={t('distributor.site')} rules={[{ required: true, message: t('distributor.pleaseSelectSite') }]}>
                <Select 
                  placeholder={t('distributor.sitePlaceholder')} 
                  loading={sitesLoading}
                  options={sites.map(site => ({
                    value: site.id,
                    label: site.name
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="gender" label={t('distributor.gender')} rules={[{ required: true, message: t('distributor.pleaseSelectGender') }]}>
                <Select placeholder={t('distributor.genderPlaceholder')} options={[{ value: 'male', label: t('distributor.male') }, { value: 'female', label: t('distributor.female') }]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="birthDate" label={t('distributor.birthDate')}>
                <DatePicker style={{ width: '100%' }} placeholder={t('distributor.birthDatePlaceholder')} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="idType"
                label={t('worker.idType')}
                rules={[
                  { required: true, message: t('form.required') }
                ]}
                initialValue="ID_CARD"
              >
                <Select placeholder={t('form.selectPlaceholder') + t('worker.idType')}>
                  <Option value="ID_CARD">{t('worker.idCard')}</Option>
                  <Option value="PASSPORT">{t('worker.passport')}</Option>
                  <Option value="DRIVER_LICENSE">{t('worker.driverLicense')}</Option>
                  <Option value="OTHER">{t('worker.other')}</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="idNumber"
                label={t('worker.idNumber')}
                rules={[
                  { required: true, message: t('form.required') }
                ]}
              >
                <Input placeholder={t('form.inputPlaceholder') + t('worker.idNumber')} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="region" label={t('distributor.region')} rules={[{ required: true, message: t('distributor.pleaseSelectRegion') }]}>
                <Select placeholder={t('distributor.regionPlaceholder')} options={[
                  { value: t('regions.mainland'), label: t('regions.mainland') },
                  { value: t('regions.hongkong'), label: t('regions.hongkong') },
                  { value: t('regions.macau'), label: t('regions.macau') },
                  { value: t('regions.taiwan'), label: t('regions.taiwan') }
                ]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              {/* 空列，保持布局 */}
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phone" label={t('distributor.phone')} rules={[{ required: true, message: t('distributor.pleaseEnterPhone') }]}>
                <Input placeholder={t('distributor.phonePlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label={t('distributor.email')}>
                <Input placeholder={t('distributor.emailPlaceholder')} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="whatsapp" label={t('distributor.whatsapp')}>
                <Input placeholder={t('distributor.whatsappPlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label={t('distributor.status')} initialValue="active">
                <Select options={[
                  { value: 'active', label: t('distributor.active') },
                  { value: 'inactive', label: t('distributor.inactive') }
                ]} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 二维码模态框 */}
      <QRCodeModal
        worker={selectedWorkerForQR}
        visible={qrCodeModalOpen}
        onClose={() => {
          setQrCodeModalOpen(false);
          setSelectedWorkerForQR(null);
        }}
      />

      {/* Excel导入导出对话框 */}
      <ExcelImportExportModal
        visible={excelModalOpen}
        onClose={() => setExcelModalOpen(false)}
        workers={workers}
        distributors={user?.distributor ? [user.distributor] : []}
        sites={sites}
        onImport={handleImportFromModal}
      />
    </div>
  )
}

export default DistributorWorkerUpload
