import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Card, Table, Button, Space, Modal, Form, Input, Select, Tag, message, Row, Col, DatePicker, Pagination } from 'antd'

const { Option } = Select
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, DownloadOutlined, ExclamationCircleOutlined, QrcodeOutlined, MailOutlined, WhatsAppOutlined, ReloadOutlined, SwapOutlined } from '@ant-design/icons'

import { Worker, Site, CreateWorkerRequest } from '../types/worker'
import { mockWorkers } from '../data/mockData'
import { 
  exportWorkersToExcel
} from '../utils/excelUtils'
import { useLocale } from '../contexts/LocaleContext'
import { useAuth } from '../hooks/useAuth'
import apiService from '../services/api'
import dayjs from 'dayjs'
import ExcelImportExportModal from '../components/ExcelImportExportModal'
import QRCodeModal from '../components/QRCodeModal'
import QuickInviteModal from '../components/QuickInviteModal'

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
  const { t, locale } = useLocale()
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
  const [sendingEmailLoading] = useState(false)
  const [sendingWhatsAppLoading] = useState(false)
  const [quickInviteModalOpen, setQuickInviteModalOpen] = useState(false)
  const [sendingInviteLoading, setSendingInviteLoading] = useState(false)
  
  // 迁移功能状态
  const [migrateModalOpen, setMigrateModalOpen] = useState(false)
  const [migrateLoading, setMigrateLoading] = useState(false)
  const [targetSiteId, setTargetSiteId] = useState<string>('')
  
  // 工地数据状态
  const [sites, setSites] = useState<Site[]>([])
  const [sitesLoading, setSitesLoading] = useState(false)
  
  // 分判商关联的工地信息
  const [distributorSites, setDistributorSites] = useState<Site[]>([])

  // 筛选状态
  const [statusFilters, setStatusFilters] = useState<string[]>([])
  const [siteFilter, setSiteFilter] = useState<string | undefined>(undefined)
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
      message.error(t('messages.loadSitesFailed'))
    } finally {
      setSitesLoading(false)
    }
  }, [])

  // 加载分判商关联的工地信息
  const loadDistributorSites = useCallback(() => {
    if (user?.distributor) {
      const distributor = user.distributor
      let sitesList: Site[] = []
      
      // 检查sites属性（通过site_distributors表关联的工地信息）
      if ('sites' in distributor && Array.isArray(distributor.sites) && distributor.sites.length > 0) {
        // 从site_distributors关联表中获取工地信息
        sitesList = distributor.sites.map((siteDistributor: unknown) => {
          const site = (siteDistributor as any).site || siteDistributor
          return {
            id: site.id,
            name: site.name,
            address: site.address || '',
            code: site.code || '',
            manager: site.manager || '',
            phone: site.phone || '',
            status: site.status || 'active'
          }
        })
      }
      // 检查siteIds属性（工地ID数组）- 兼容旧格式
      else if ('siteIds' in distributor && Array.isArray(distributor.siteIds) && distributor.siteIds.length > 0) {
        // 从所有工地中查找对应的工地信息
        sitesList = sites.filter(site => (distributor.siteIds as string[]).includes(site.id))
      }
      
      setDistributorSites(sitesList)
    }
  }, [user?.distributor, sites])

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
      // 映射状态格式，确保包含所有必需字段
      const mappedWorkers = workersData.map(worker => ({
        ...worker,
        status: mapWorkerStatus(worker.status) as 'active' | 'inactive',
        region: worker.region || '',
        email: worker.email || '',
        whatsapp: worker.whatsapp || '',
        distributor: worker.distributor ? {
          ...worker.distributor,
          distributorId: worker.distributor.distributorId || worker.distributor.id
        } : undefined
      }))
      setWorkers(mappedWorkers)
    } catch (error) {
      console.error('加载工人数据失败:', error)
      message.error(t('messages.loadWorkersFailed'))
      // 降级到模拟数据
      setWorkers(mockWorkers.filter(w => w.distributorId === currentDistributor.id))
    } finally {
      setLoading(false)
    }
  }, [t, currentDistributor.id])

  // 刷新数据
  const handleRefresh = useCallback(async () => {
    try {
      await Promise.all([loadWorkers(), loadSites()])
      message.success(t('messages.refreshSuccess'))
    } catch (error) {
      // console.error('刷新数据失败:', error)
      message.error(t('messages.refreshFailed'))
    }
  }, [loadWorkers, loadSites, t])

  // 组件挂载时加载数据
  useEffect(() => {
    loadWorkers()
    loadSites()
  }, [loadWorkers, loadSites])

  // 当工地数据或用户信息变化时，加载分判商关联的工地
  useEffect(() => {
    loadDistributorSites()
  }, [loadDistributorSites])

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
  const onWorkerSubmit = async () => {
    try {
      const values = await workerForm.validateFields()
      setLoading(true)
      
      if (editingWorker) {
        // 编辑工人
        const updateData = {
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
        }
        
        await apiService.updateDistributorWorker(editingWorker.id, updateData)
        
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
                email: values.email || '',
                whatsapp: values.whatsapp || '',
                updatedAt: new Date().toISOString()
              }
            : w
        ))
        
        message.success(t('distributor.workerInfoUpdated'))
      } else {
        // 新增工人
        const selectedSiteId = values.siteId
        
        if (!user?.distributor) {
          message.error(t('messages.distributorInfoGetFailed'))
          return
        }
        
        if (!selectedSiteId) {
          message.error(t('messages.pleaseSelectSite'))
          return
        }
        
        const createData: CreateWorkerRequest = {
          name: values.name,
          phone: values.phone,
          idType: values.idType,
          idNumber: values.idNumber,
          gender: values.gender?.toUpperCase() as 'MALE' | 'FEMALE',
          region: values.region || getDefaultAreaCode(), // 保存区号，根据当前语言设置默认值
          siteId: selectedSiteId,
          distributorId: currentDistributor?.id || 'default-distributor',
          status: (values.status?.toUpperCase() || 'ACTIVE') as 'ACTIVE' | 'INACTIVE',
          birthDate: values.birthDate ? values.birthDate.toISOString() : null,
          email: values.email || null,
          whatsapp: values.whatsapp || null
        }
        
        const newWorker = await apiService.createDistributorWorker(createData)
        message.success(t('distributor.workerInfoAdded'))
        
        // 将新创建的工人添加到本地工人列表头部
        const processedWorker = {
          ...newWorker,
          status: mapWorkerStatus(newWorker.status) as 'active' | 'inactive',
          region: newWorker.region || values.region || '',
          email: newWorker.email || values.email || '',
          whatsapp: newWorker.whatsapp || values.whatsapp || '',
          distributor: newWorker.distributor ? {
            ...newWorker.distributor,
            distributorId: newWorker.distributor.distributorId || newWorker.distributor.id
          } : undefined
        };
        
        setWorkers(prev => [processedWorker, ...prev])
        
        // 显示二维码发送选项
        setSelectedWorkerForQR(processedWorker)
        setQrCodeModalOpen(true)
      }
      
      setWorkerModalOpen(false)
      setEditingWorker(null)
      workerForm.resetFields()
    } catch (error: unknown) {
      console.error('操作失败:', error)
      
      let errorMessage = t('distributor.operationFailed')
      
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMsg = (error as { message: string }).message
        
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
          errorMessage = errorMsg
        }
      }
      
      message.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // 处理快速邀请
  const handleQuickInvite = async (phoneNumbers: string[], areaCode: string, siteId: string) => {
    try {
      setSendingInviteLoading(true)
        
        // 获取当前的语言设置
        const currentLocale = localStorage.getItem('locale') || 'zh-CN'
        
        // 获取当前分判商信息
        const currentDistributor = user?.distributor
        
        if (!currentDistributor?.id) {
          message.error(t('messages.distributorInfoGetFailed'))
          return
        }
        
      // 调用API发送邀请链接
      const result = await apiService.sendInviteLink({
        phoneNumbers,
        areaCode,
        language: currentLocale,
        distributorId: currentDistributor.id,
        siteId: siteId
      })
        
          if (result.success) {
        if (result.results) {
          const { total, succeeded, failed } = result.results
          if (failed === 0) {
            message.success(t('distributor.inviteSuccess') + ` (${succeeded}/${total})`)
          } else {
            message.warning(t('messages.importCompletedWithErrors', { success: succeeded.toString(), skipped: '0', errors: failed.toString() }))
            
            // 显示失败详情
            if (result.results.details) {
              const failedDetails = result.results.details.filter(detail => !detail.success)
              if (failedDetails.length > 0) {
                      Modal.warning({
                  title: '部分邀请发送失败',
                        content: (
                          <div>
                      <p>以下电话号码发送失败：</p>
                      <ul>
                        {failedDetails.map((detail, index) => (
                          <li key={index}>
                            {detail.phoneNumber}: {detail.message}
                          </li>
                        ))}
                      </ul>
                          </div>
                        ),
                        okText: t('common.ok'),
                  width: 500
                })
              }
            }
          }
        } else {
          message.success(t('distributor.inviteSuccess'))
        }
          } else {
        message.error(result.message || t('distributor.inviteFailed'))
      }
    } catch (error) {
      console.error('发送邀请链接失败:', error)
      message.error(t('distributor.inviteFailed'))
    } finally {
      setSendingInviteLoading(false)
    }
  }

  // 处理工人迁移
  const handleMigrateWorkers = async () => {
    if (selectedWorkerIds.length === 0) {
      message.warning(t('messages.pleaseSelectWorkersToMigrate'))
      return
    }
    
    if (!targetSiteId) {
      message.warning(t('messages.pleaseSelectTargetSite'))
      return
    }
    
    const targetSite = sites.find(site => site.id === targetSiteId)
    if (!targetSite) {
      message.error(t('messages.targetSiteNotExists'))
      return
    }
    
    // 显示确认对话框
    Modal.confirm({
      title: t('distributor.migrateConfirm'),
      icon: <ExclamationCircleOutlined />,
      content: t('distributor.migrateConfirmContent', { 
        count: selectedWorkerIds.length.toString(), 
        siteName: targetSite.name 
      }),
      onOk: async () => {
        try {
          setMigrateLoading(true)
          
          // 批量更新选中的工人 - 只更新siteId字段
          const updatePromises = selectedWorkerIds.map(workerId => {
            // 简化数据传递，只传递siteId，让后端保持其他字段不变
            return apiService.updateDistributorWorker(workerId, { siteId: targetSiteId })
          })
          
          await Promise.all(updatePromises)
          
          // 更新本地状态
          setWorkers(prev => prev.map(worker => 
            selectedWorkerIds.includes(worker.id) 
              ? { 
                  ...worker, 
                  siteId: targetSiteId,
                  site: targetSite,
                  updatedAt: new Date().toISOString()
                }
              : worker
          ))
          
          message.success(t('distributor.migrateSuccess'))
          setSelectedWorkerIds([])
          setMigrateModalOpen(false)
          setTargetSiteId('')
        } catch (error) {
          console.error('迁移工人失败:', error)
          message.error(t('distributor.migrateFailed'))
        } finally {
          setMigrateLoading(false)
        }
      }
    })
  }

  // 处理复制链接
  const handleCopyLink = (siteId: string) => {
    const currentDistributor = user?.distributor
    
    if (!currentDistributor?.id) {
      message.error(t('messages.distributorInfoGetFailed'))
      return
    }
    
    // 生成完整的注册链接
    const baseUrl = window.location.origin
    const registrationLink = `${baseUrl}/worker-registration?distributorId=${currentDistributor.id}&siteId=${siteId}`
    
    // 检查是否支持现代剪贴板API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      // 使用现代剪贴板API
      navigator.clipboard.writeText(registrationLink).then(() => {
        message.success(t('distributor.copyLinkSuccess'))
      }).catch((error) => {
        console.warn('现代剪贴板API失败，尝试降级方案:', error)
        // 降级到传统方法
        fallbackCopyToClipboard(registrationLink)
      })
    } else {
      // 直接使用传统方法
      fallbackCopyToClipboard(registrationLink)
    }
  }

  // 降级复制方法
  const fallbackCopyToClipboard = (text: string) => {
    try {
      // 创建临时文本区域
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      
      // 选择并复制文本
      textArea.focus()
      textArea.select()
      
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      
      if (successful) {
        message.success(t('distributor.copyLinkSuccess'))
      } else {
        // 如果复制失败，显示链接让用户手动复制
        showManualCopyDialog(text)
      }
    } catch (error) {
      console.error('复制失败:', error)
      // 显示链接让用户手动复制
      showManualCopyDialog(text)
    }
  }

  // 显示手动复制对话框
  const showManualCopyDialog = (text: string) => {
    Modal.info({
      title: t('distributor.manualCopyTitle'),
      content: (
        <div>
          <p>{t('distributor.manualCopyDescription')}</p>
          <Input.TextArea
            value={text}
            readOnly
            rows={3}
            style={{ marginTop: 8 }}
            onFocus={(e) => e.target.select()}
          />
        </div>
      ),
      okText: t('distributor.manualCopyOk'),
      width: 500
    })
  }

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

  // 根据当前语言获取默认区号
  const getDefaultAreaCode = () => {
    if (locale === 'zh-CN') {
      return '+86'; // 简体中文默认中国大陆
    } else {
      return '+852'; // 繁体中文和英文默认香港
    }
  };

  // 根据区号获取对应的地区名称
  const getRegionNameByAreaCode = (areaCode: string) => {
    const areaCodeMap: Record<string, string> = {
      '+86': t('distributor.areaCodeChina'),
      '+852': t('distributor.areaCodeHongKong'),
      '+853': t('distributor.areaCodeMacau'),
      '+886': t('distributor.areaCodeTaiwan'),
      '+65': t('distributor.areaCodeSingapore'),
      '+60': t('distributor.areaCodeMalaysia'),
      '+66': t('distributor.areaCodeThailand'),
      '+63': t('distributor.areaCodePhilippines'),
      '+62': t('distributor.areaCodeIndonesia'),
      '+84': t('distributor.areaCodeVietnam'),
      '+1': t('distributor.areaCodeUSCanada'),
      '+44': t('distributor.areaCodeUK'),
      '+49': t('distributor.areaCodeGermany'),
      '+33': t('distributor.areaCodeFrance'),
      '+81': t('distributor.areaCodeJapan'),
      '+82': t('distributor.areaCodeKorea'),
      '+91': t('distributor.areaCodeIndia'),
      '+61': t('distributor.areaCodeAustralia'),
    }
    
    // 如果传入的是区号，返回对应的地区名称
    if (areaCodeMap[areaCode]) {
      return areaCodeMap[areaCode]
    }
    
    // 如果传入的是旧的地区名称，尝试反向映射
    const reverseMap: Record<string, string> = {
      [t('regions.mainland')]: t('distributor.areaCodeChina'),
      [t('regions.hongkong')]: t('distributor.areaCodeHongKong'),
      [t('regions.macau')]: t('distributor.areaCodeMacau'),
      [t('regions.taiwan')]: t('distributor.areaCodeTaiwan'),
    }
    
    return reverseMap[areaCode] || areaCode || '-'
  }

  // 工人表格列定义
  const workerColumns = [
    { title: t('distributor.workerId'), dataIndex: 'workerId', key: 'workerId', width: 110, fixed: 'left' as const, ellipsis: true, sorter: (a: Worker, b: Worker) => a.workerId.localeCompare(b.workerId) },
    { title: t('distributor.name'), dataIndex: 'name', key: 'name', width: 130, fixed: 'left' as const, ellipsis: true, sorter: (a: Worker, b: Worker) => a.name.localeCompare(b.name) },
    { title: t('distributor.gender'), dataIndex: 'gender', key: 'gender', width: 90, render: (gender: string) => getGenderTag(gender), ellipsis: true, sorter: (a: Worker, b: Worker) => a.gender.localeCompare(b.gender) },
    { 
      title: t('distributor.birthDate'), 
      dataIndex: 'birthDate', 
      key: 'birthDate', 
      width: 110, 
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
      width: 70, 
      render: (_age: number, record: Worker) => {
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
      width: 90,
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
      width: 160,
      sorter: (a: Worker, b: Worker) => a.idNumber.localeCompare(b.idNumber),
    },
    { 
      title: t('distributor.region'), 
      dataIndex: 'region', 
      key: 'region', 
      width: 120, 
      ellipsis: true, 
      sorter: (a: Worker, b: Worker) => a.region.localeCompare(b.region),
      render: (region: string) => getRegionNameByAreaCode(region)
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
    { title: t('distributor.status'), dataIndex: 'status', key: 'status', width: 90, render: (status: string) => getStatusTag(status), ellipsis: true, sorter: (a: Worker, b: Worker) => a.status.localeCompare(b.status) },
    { title: t('common.actions'), key: 'actions', width: 120, fixed: 'right' as const, ellipsis: true, render: (_: unknown, record: Worker) => (
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
              region: record.region // 直接使用数据库原始值（区号）
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
          danger 
          icon={<DeleteOutlined />} 
          onClick={() => {
            Modal.confirm({
              title: t('distributor.confirmDelete'),
              icon: <ExclamationCircleOutlined />,
              content: t('distributor.confirmDeleteContent', { name: record.name }),
              onOk: async () => {
                try {
                  setLoading(true)
                  await apiService.deleteDistributorWorker(record.id)
                  message.success(t('distributor.workerInfoDeleted'))
                  setWorkers(prev => prev.filter(w => w.id !== record.id))
                } catch (error) {
                  console.error('删除工人失败:', error)
                  message.error(t('messages.operationFailedGeneric'))
                } finally {
                  setLoading(false)
                }
              }
            })
          }}
          title={t('common.delete')}
        />
      </Space>
    ) }
  ]

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
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>{`${t('distributor.workerInfoManagement')} (${workers.length})`}</span>
            <Button 
              type="link"
              icon={<WhatsAppOutlined />}
              onClick={() => setQuickInviteModalOpen(true)}
            >
              {t('distributor.generateRegistrationLink')}
            </Button>
          </div>
        }
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
                placeholder={t('distributor.siteFilter')}
                value={siteFilter}
                onChange={(value) => setSiteFilter(value || undefined)}
                options={sites.map(site => ({ value: site.id, label: site.name }))}
                allowClear
                loading={sitesLoading}
                dropdownStyle={{ maxHeight: 300, overflow: 'auto' }}
              />
            </div>
            
            {/* 操作按钮 */}
            <Space>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={handleRefresh}
                loading={loading || sitesLoading}
              >
                {t('distributor.refresh')}
              </Button>
              <Button 
                icon={<UploadOutlined />} 
                onClick={() => setExcelModalOpen(true)}
              >
                {t('distributor.excelImport')}
              </Button>
              <Button 
                icon={<DownloadOutlined />} 
                onClick={() => {
                  const dataToExport = selectedWorkerIds.length === 0 ? workers : workers.filter(worker => selectedWorkerIds.includes(worker.id))
                  if (selectedWorkerIds.length === 0) {
                    exportWorkersToExcel(dataToExport, user?.distributor ? [user.distributor] : [], sites)
                    message.success(t('distributor.exportedWorkers', { count: dataToExport.length.toString() }))
                  } else {
                    message.warning(t('messages.pleaseSelectWorkersToExport'))
                  }
                }}
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
                    region: getDefaultAreaCode(), // 根据当前语言设置默认区号
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
                    onClick={() => {
                      message.info('批量发送邮件功能暂未实现')
                    }}
                    loading={sendingEmailLoading}
                  >
                    {t('worker.batchSendToEmail')}
                  </Button>
                  <Button
                    size="small"
                    type="primary"
                    icon={<WhatsAppOutlined />}
                    onClick={() => {
                      message.info('批量发送WhatsApp功能暂未实现')
                    }}
                    loading={sendingWhatsAppLoading}
                  >
                    {t('worker.batchSendToWhatsApp')}
                  </Button>
                  <Button
                    size="small"
                    type="primary"
                    icon={<SwapOutlined />}
                    onClick={() => setMigrateModalOpen(true)}
                  >
                    {t('distributor.migrateWorkers')}
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
              <Form.Item name="region" label={t('distributor.areaCode')} rules={[{ required: true, message: t('distributor.pleaseSelectAreaCode') }]}>
                <Select 
                  placeholder={t('distributor.areaCodePlaceholder')}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {[
                    { value: '+86', label: `+86 (${t('distributor.areaCodeChina')})` },
                    { value: '+852', label: `+852 (${t('distributor.areaCodeHongKong')})` },
                    { value: '+853', label: `+853 (${t('distributor.areaCodeMacau')})` },
                    { value: '+886', label: `+886 (${t('distributor.areaCodeTaiwan')})` },
                    { value: '+65', label: `+65 (${t('distributor.areaCodeSingapore')})` },
                    { value: '+60', label: `+60 (${t('distributor.areaCodeMalaysia')})` },
                    { value: '+66', label: `+66 (${t('distributor.areaCodeThailand')})` },
                    { value: '+63', label: `+63 (${t('distributor.areaCodePhilippines')})` },
                    { value: '+62', label: `+62 (${t('distributor.areaCodeIndonesia')})` },
                    { value: '+84', label: `+84 (${t('distributor.areaCodeVietnam')})` },
                    { value: '+1', label: `+1 (${t('distributor.areaCodeUSCanada')})` },
                    { value: '+44', label: `+44 (${t('distributor.areaCodeUK')})` },
                    { value: '+49', label: `+49 (${t('distributor.areaCodeGermany')})` },
                    { value: '+33', label: `+33 (${t('distributor.areaCodeFrance')})` },
                    { value: '+81', label: `+81 (${t('distributor.areaCodeJapan')})` },
                    { value: '+82', label: `+82 (${t('distributor.areaCodeKorea')})` },
                    { value: '+91', label: `+91 (${t('distributor.areaCodeIndia')})` },
                    { value: '+61', label: `+61 (${t('distributor.areaCodeAustralia')})` },
                  ].map(option => (
                    <Option key={option.value} value={option.value} label={option.label}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
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
        onImport={async (file: File) => {
          try {
            setLoading(true)
            const result = await apiService.importDistributorWorkersFromExcel(file)
            
            if (result.success !== undefined) {
              const { success, skipped, errors } = result
              if (errors > 0) {
                message.warning(t('messages.importCompletedWithErrors', { success: success.toString(), skipped: skipped.toString(), errors: errors.toString() }))
              } else {
                message.success(t('messages.importSuccessWithCount', { success: success.toString(), skipped: skipped.toString() }))
              }
              
              // 刷新工人列表
              await loadWorkers()
            } else {
              message.success(t('messages.excelImportSuccess'))
              // 刷新工人列表
              await loadWorkers()
            }
          } catch (error: unknown) {
            console.error('Excel导入失败:', error)
            const errorMessage = (error instanceof Error ? error.message : '导入失败，请检查文件格式')
            message.error(t('messages.excelImportFailed', { error: errorMessage }))
          } finally {
            setLoading(false)
          }
        }}
      />

      {/* 快速邀请弹窗 */}
        <QuickInviteModal
          visible={quickInviteModalOpen}
          onClose={() => setQuickInviteModalOpen(false)}
          onSend={handleQuickInvite}
          onCopyLink={handleCopyLink}
          sites={distributorSites}
          loading={sendingInviteLoading}
        />

      {/* 迁移工人模态框 */}
      <Modal
        title={t('distributor.migrateWorkersToSite')}
        open={migrateModalOpen}
        onCancel={() => {
          setMigrateModalOpen(false)
          setTargetSiteId('')
        }}
        onOk={handleMigrateWorkers}
        confirmLoading={migrateLoading}
        destroyOnClose
        width={500}
      >
        <div style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px 0', color: '#666' }}>
            {t('distributor.selectedWorkers', { count: selectedWorkerIds.length.toString() })}
          </p>
        </div>
        
        <Form layout="vertical">
          <Form.Item 
            label={t('distributor.selectTargetSite')}
            required
          >
            <Select
              placeholder={t('distributor.selectTargetSite')}
              value={targetSiteId}
              onChange={setTargetSiteId}
              style={{ width: '100%' }}
              options={sites.map(site => ({
                value: site.id,
                label: site.name
              }))}
              loading={sitesLoading}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default DistributorWorkerUpload;