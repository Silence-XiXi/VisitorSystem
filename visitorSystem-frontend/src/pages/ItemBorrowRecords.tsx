import React, { useMemo, useState, useEffect } from 'react'
import { Table, Space, Button, Row, Col, message, Select, Input, DatePicker, Tag, Modal, Pagination, Card } from 'antd'
import { SearchOutlined, DownloadOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { useLocale } from '../contexts/LocaleContext'
import { useSiteFilter } from '../contexts/SiteFilterContext'
import { useAuth } from '../hooks/useAuth'
import { apiService } from '../services/api'
import * as XLSX from 'xlsx'

interface ItemBorrowRecord {
  id: string
  key: string
  workerId: string
  workerName: string
  distributorName: string
  siteName: string
  itemCode: string
  itemType: string
  physicalCardId?: string
  borrowDate: string
  borrowTime: string
  returnDate?: string
  returnTime?: string
  status: 'BORROWED' | 'RETURNED'
  borrowDuration?: number // 借用时长（分钟）
  borrowHandlerId?: string // 借用经办人ID
  borrowHandlerName?: string // 借用经办人姓名
  returnHandlerName?: string // 归还经办人姓名
  notes?: string // 借用备注
  item?: {
    id: string
    itemCode: string
    name: string
    category: {
      id: string
      name: string
    }
  }
  worker?: {
    id: string
    workerId: string
    name: string
    distributor: {
      id: string
      name: string
    }
    site: {
      id: string
      name: string
    }
  }
  site?: {
    id: string
    name: string
  }
  borrowHandler?: {
    id: string
    name: string
  }
  returnHandler?: {
    id: string
    name: string
  }
}

// 转换后端数据为前端格式
const transformBorrowRecord = (record: any): ItemBorrowRecord => {
  return {
    id: record.id,
    key: record.id,
    workerId: record.worker?.workerId || '',
    workerName: record.worker?.name || '',
    distributorName: record.worker?.distributor?.name || '',
    siteName: record.site?.name || '',
    itemCode: record.item?.itemCode || '',
    itemType: record.item?.category?.name || '',
    physicalCardId: record.worker?.visitorRecords?.[0]?.physicalCardId,
    borrowDate: dayjs(record.borrowDate).format('YYYY-MM-DD'),
    borrowTime: record.borrowTime || '',
    returnDate: record.returnDate ? dayjs(record.returnDate).format('YYYY-MM-DD') : undefined,
    returnTime: record.returnTime || undefined,
    status: record.status,
    borrowDuration: record.borrowDuration,
    borrowHandlerId: record.borrowHandler?.id,
    borrowHandlerName: record.borrowHandler?.name,
    returnHandlerName: record.returnHandler?.name,
    notes: record.notes || '',
    item: record.item,
    worker: record.worker,
    site: record.site,
    borrowHandler: record.borrowHandler,
    returnHandler: record.returnHandler
  }
}

const ItemBorrowRecords: React.FC = () => {
  const { t, locale } = useLocale()
  const { selectedSiteId } = useSiteFilter()
  const { user } = useAuth()
  const [searchKeyword, setSearchKeyword] = useState<string>('')
  const [selectedDistributor, setSelectedDistributor] = useState<string>('')
  const [selectedItemType, setSelectedItemType] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false)
  const [selectedRecord, setSelectedRecord] = useState<ItemBorrowRecord | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [exportModalVisible, setExportModalVisible] = useState(false)
  
  // 分页状态
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  })
  
  // 数据状态
  const [borrowRecords, setBorrowRecords] = useState<ItemBorrowRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [distributors, setDistributors] = useState<any[]>([])
  const [itemCategories, setItemCategories] = useState<any[]>([])

  // 格式化借用时长（将分钟转换为友好的显示格式，支持多语言）
  const formatBorrowDuration = (minutes: number | null | undefined): string => {
    // 检查空值
    if (minutes === null || minutes === undefined) return '-'
    
    // 确保传入的是有效数字
    const totalMinutes = Number(minutes)
    if (isNaN(totalMinutes) || totalMinutes < 0) return '-'
    
    // 计算小时和分钟
    const hours = Math.floor(totalMinutes / 60)
    const mins = Math.floor(totalMinutes % 60)
    
    // 根据语言选择单复数形式（英文需要区分单复数）
    const hourUnit = locale === 'en-US' 
      ? (hours === 1 ? t('common.hour') : t('common.hours'))
      : t('common.hours')
    
    const minuteUnit = locale === 'en-US'
      ? (mins === 1 ? t('common.minute') : t('common.minutes'))
      : t('common.minutes')
    
    // 组合显示
    if (hours > 0 && mins > 0) {
      return `${hours} ${hourUnit} ${mins} ${minuteUnit}`
    } else if (hours > 0) {
      return `${hours} ${hourUnit}`
    } else {
      return `${mins} ${minuteUnit}`
    }
  }

  // 格式化归还时间（如果不是同一天，显示日期+时间；如果是同一天，只显示时间）
  const formatReturnTime = (record: ItemBorrowRecord): string => {
    // 如果没有归还时间，返回 -
    if (!record.returnDate || !record.returnTime) return '-'
    
    // 比较借用日期和归还日期
    const borrowDate = record.borrowDate
    const returnDate = record.returnDate
    
    // 如果是同一天，只显示时间
    if (borrowDate === returnDate) {
      return record.returnTime
    }
    
    // 如果不是同一天，显示日期+时间
    return `${returnDate} ${record.returnTime}`
  }

  // 加载物品借用记录
  const loadBorrowRecords = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const filters: any = {}
      
      // 根据用户角色选择不同的API
      if (user.role?.toLowerCase() === 'admin') {
        if (selectedSiteId) filters.siteId = selectedSiteId
        if (selectedStatus) filters.status = selectedStatus
        if (dateRange && dateRange[0] && dateRange[1]) {
          filters.startDate = dateRange[0].format('YYYY-MM-DD')
          filters.endDate = dateRange[1].format('YYYY-MM-DD')
        }
        
        const records = await apiService.getAllBorrowRecords(filters)
        const transformedRecords = records.map(transformBorrowRecord)
        setBorrowRecords(transformedRecords)
        
        // 当数据更新时，重置到第一页
        if (pagination.current !== 1) {
          setPagination(prev => ({
            ...prev,
            current: 1,
            total: transformedRecords.length
          }))
        } else {
          setPagination(prev => ({
            ...prev,
            total: transformedRecords.length
          }))
        }
      } else if (user.role?.toLowerCase() === 'guard') {
        if (selectedStatus) filters.status = selectedStatus
        
        const records = await apiService.getGuardSiteBorrowRecords(filters)
        const transformedRecords = records.map(transformBorrowRecord)
        setBorrowRecords(transformedRecords)
        
        // 当数据更新时，重置到第一页
        if (pagination.current !== 1) {
          setPagination(prev => ({
            ...prev,
            current: 1,
            total: transformedRecords.length
          }))
        } else {
          setPagination(prev => ({
            ...prev,
            total: transformedRecords.length
          }))
        }
      }
    } catch (error) {
      console.error('加载物品借用记录失败:', error)
      message.error(t('messages.loadDataFailed'))
    } finally {
      setLoading(false)
    }
  }

  // 加载分判商数据
  const loadDistributors = async () => {
    try {
      const data = await apiService.getAllDistributors()
      setDistributors(data)
    } catch (error) {
      console.error('加载分判商数据失败:', error)
    }
  }

  // 加载物品类型数据
  const loadItemCategories = async () => {
    try {
      const data = await apiService.getAllItemCategories()
      setItemCategories(data)
    } catch (error) {
      console.error('加载物品类型数据失败:', error)
    }
  }

  // 页面加载时获取数据
  useEffect(() => {
    loadBorrowRecords()
    loadDistributors()
    loadItemCategories()
  }, [user, selectedSiteId, selectedStatus, dateRange])

  // 筛选后的数据
  const filteredData = useMemo(() => {
    let filtered = borrowRecords

    // 搜索关键词筛选
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase()
      filtered = filtered.filter(record => 
        record.workerName.toLowerCase().includes(keyword) ||
        record.workerId.toLowerCase().includes(keyword) ||
        record.itemCode.toLowerCase().includes(keyword) ||
        record.itemType.toLowerCase().includes(keyword) ||
        (record.borrowHandlerName && record.borrowHandlerName.toLowerCase().includes(keyword))
      )
    }

    // 分判商筛选
    if (selectedDistributor) {
      filtered = filtered.filter(record => record.distributorName === selectedDistributor)
    }

    // 物品类型筛选
    if (selectedItemType) {
      filtered = filtered.filter(record => record.itemType === selectedItemType)
    }

    // 状态筛选
    if (selectedStatus) {
      filtered = filtered.filter(record => record.status === selectedStatus)
    }
    
    // 更新total值，但不重置current
    setPagination(prev => ({
      ...prev,
      total: filtered.length
    }));

    return filtered
  }, [borrowRecords, searchKeyword, selectedDistributor, selectedItemType, selectedStatus])
  
  // 带分页的数据
  const paginatedData = useMemo(() => {
    const { current, pageSize } = pagination;
    const startIndex = (current - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, pagination.current, pagination.pageSize])


  // 显示详情
  const showDetail = (record: ItemBorrowRecord) => {
    setSelectedRecord(record)
    setDetailModalVisible(true)
  }

  // 导出Excel
  const exportToExcel = () => {
    const dataToExport = selectedRowKeys.length > 0 
      ? filteredData.filter(item => selectedRowKeys.includes(item.key))
      : filteredData
    
    if (dataToExport.length === 0) {
      message.warning(t('itemBorrowRecords.noDataToExport'))
      return
    }
    
    try {
      // 准备导出数据 - 使用英文表头
      const exportData = dataToExport.map(record => ({
        'BorrowDate': record.borrowDate,
        'WorkerName': record.workerName,
        'PhysicalCardId': record.physicalCardId || '-',
        'Distributor': record.distributorName,
        'Site': record.siteName,
        'ItemType': record.itemType,
        'ItemCode': record.itemCode,
        'BorrowTime': record.borrowTime,
        'Notes': record.notes || '-',
        'ReturnTime': formatReturnTime(record),
        'Status': record.status === 'BORROWED' ? 'Not Returned' : 'Returned',
        'BorrowDuration': formatBorrowDuration(record.borrowDuration),
        'BorrowHandler': record.borrowHandlerName || '-'
      }))
      
      // 创建工作簿
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.json_to_sheet(exportData)
      
      // 设置列宽
      const colWidths = [
        { wch: 12 }, // 借用日期
        { wch: 15 }, // 工人姓名
        { wch: 15 }, // 实体卡ID
        { wch: 20 }, // 分判商
        { wch: 20 }, // 工地名称
        { wch: 15 }, // 物品类型
        { wch: 15 }, // 物品编号
        { wch: 10 }, // 借用时间
        { wch: 20 }, // 备注
        { wch: 20 }, // 归还时间（可能包含日期）
        { wch: 10 }, // 状态
        { wch: 15 }, // 借用时长
        { wch: 15 }  // 借用经办人
      ]
      worksheet['!cols'] = colWidths
      
      // 添加工作表
      XLSX.utils.book_append_sheet(workbook, worksheet, t('itemBorrowRecords.title'))
      
      // 生成文件名并下载
      const fileName = `ItemBorrowRecords_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(workbook, fileName)
      
      const exportType = selectedRowKeys.length > 0 ? t('itemBorrowRecords.exportSelected').replace('({count})', '') : t('itemBorrowRecords.exportAll')
      message.success(t('itemBorrowRecords.exportSuccess').replace('{type}', exportType).replace('{count}', dataToExport.length.toString()))
    } catch (error) {
      console.error('导出失败:', error)
      message.error(t('itemBorrowRecords.exportFailed'))
    }
  }

  // 表格列定义
  const columns = [
    { 
      title: t('itemBorrowRecords.borrowDate'), 
      dataIndex: 'borrowDate', 
      key: 'borrowDate', 
      width: 120,
      fixed: 'left' as const,
      sorter: (a: ItemBorrowRecord, b: ItemBorrowRecord) => dayjs(a.borrowDate).unix() - dayjs(b.borrowDate).unix()
    },
    { 
      title: t('itemBorrowRecords.workerName'), 
      dataIndex: 'workerName', 
      key: 'workerName', 
      width: 120,
      fixed: 'left' as const,
      sorter: (a: ItemBorrowRecord, b: ItemBorrowRecord) => a.workerName.localeCompare(b.workerName)
    },
    { 
      title: t('itemBorrowRecords.physicalCardId'), 
      dataIndex: 'physicalCardId', 
      key: 'physicalCardId', 
      width: 120,
      sorter: (a: ItemBorrowRecord, b: ItemBorrowRecord) => (a.physicalCardId || '').localeCompare(b.physicalCardId || ''),
      render: (id: string) => id || '-'
    },
    { 
      title: t('itemBorrowRecords.distributor'), 
      dataIndex: 'distributorName', 
      key: 'distributorName', 
      width: 140,
      sorter: (a: ItemBorrowRecord, b: ItemBorrowRecord) => a.distributorName.localeCompare(b.distributorName)
    },
    { 
      title: t('itemBorrowRecords.itemType'), 
      dataIndex: 'itemType', 
      key: 'itemType', 
      width: 100,
      sorter: (a: ItemBorrowRecord, b: ItemBorrowRecord) => a.itemType.localeCompare(b.itemType)
    },
    { 
      title: t('itemBorrowRecords.itemCode'), 
      dataIndex: 'itemCode', 
      key: 'itemCode', 
      width: 140,
      sorter: (a: ItemBorrowRecord, b: ItemBorrowRecord) => a.itemCode.localeCompare(b.itemCode)
    },
    { 
      title: t('itemBorrowRecords.borrowTime'), 
      dataIndex: 'borrowTime', 
      key: 'borrowTime', 
      width: 100,
      sorter: (a: ItemBorrowRecord, b: ItemBorrowRecord) => a.borrowTime.localeCompare(b.borrowTime)
    },
    { 
      title: t('itemBorrowRecords.borrowHandler'), 
      dataIndex: 'borrowHandlerName', 
      key: 'borrowHandlerName', 
      width: 120,
      sorter: (a: ItemBorrowRecord, b: ItemBorrowRecord) => (a.borrowHandlerName || '').localeCompare(b.borrowHandlerName || ''),
      render: (name: string) => name || '-'
    },
    { 
      title: t('itemBorrowRecords.notes') || '备注', 
      dataIndex: 'notes', 
      key: 'notes', 
      width: 150,
      ellipsis: true,
      render: (notes: string) => notes ? (
        <span title={notes}>
          {notes.length > 20 ? `${notes.substring(0, 20)}...` : notes}
        </span>
      ) : '-'
    },
    { 
      title: t('itemBorrowRecords.returnTime'), 
      dataIndex: 'returnTime', 
      key: 'returnTime', 
      width: 160,
      sorter: (a: ItemBorrowRecord, b: ItemBorrowRecord) => {
        const aTime = a.returnDate ? `${a.returnDate} ${a.returnTime || ''}` : ''
        const bTime = b.returnDate ? `${b.returnDate} ${b.returnTime || ''}` : ''
        return aTime.localeCompare(bTime)
      },
      render: (_: string, record: ItemBorrowRecord) => formatReturnTime(record)
    },
    { 
      title: t('itemBorrowRecords.status'), 
      dataIndex: 'status', 
      key: 'status', 
      width: 80,
      sorter: (a: ItemBorrowRecord, b: ItemBorrowRecord) => a.status.localeCompare(b.status),
      render: (status: string) => (
        <Tag color={status === 'RETURNED' ? 'green' : 'orange'}>
          {status === 'RETURNED' ? t('itemBorrowRecords.returned') : t('itemBorrowRecords.notReturned')}
        </Tag>
      )
    },
    { 
      title: t('itemBorrowRecords.borrowDuration'), 
      dataIndex: 'borrowDuration', 
      key: 'borrowDuration', 
      width: 120,
      sorter: (a: ItemBorrowRecord, b: ItemBorrowRecord) => (a.borrowDuration || 0) - (b.borrowDuration || 0),
      render: (duration: number) => formatBorrowDuration(duration)
    },
    {
      title: t('itemBorrowRecords.actions'),
      key: 'actions',
      width: 140,
      fixed: 'right' as const,
      render: (_: any, record: ItemBorrowRecord) => (
        <Space size="small">
          <Button 
            type="link"
            size="small"
            icon={<EyeOutlined />} 
            onClick={() => showDetail(record)}
          >
            {t('itemBorrowRecords.viewDetail')}
          </Button>
        </Space>
      )
    }
  ]

  return (
    <div style={{ padding: '12px' }}>
      {/* 页面标题和操作区域 */}
      <div style={{ 
        marginBottom: 12, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* 左侧标题区域 */}
        <div style={{ flex: '1 1 auto', minWidth: '300px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            {t('itemBorrowRecords.title')}
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '13px' }}>
            {t('itemBorrowRecords.description').replace('{count}', borrowRecords.length.toString())}
          </p>
        </div>

        {/* 右侧筛选和操作区域 */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          flexWrap: 'wrap',
          justifyContent: 'flex-end'
        }}>
          {/* 搜索框 */}
          <Input.Search
            placeholder={t('itemBorrowRecords.searchPlaceholder')}
            value={searchKeyword}
            onChange={(e) => {
              setSearchKeyword(e.target.value);
              setPagination(prev => ({ ...prev, current: 1 }));
            }}
            onSearch={(value) => {
              setSearchKeyword(value);
              setPagination(prev => ({ ...prev, current: 1 }));
            }}
            allowClear
            enterButton={<SearchOutlined />}
            style={{ 
              minWidth: '200px',
              maxWidth: '300px',
              width: 'clamp(200px, 25vw, 300px)'
            }}
          />
          
          {/* 分判商筛选 */}
          <Select
            placeholder={t('itemBorrowRecords.allDistributors')}
            value={selectedDistributor || undefined}
            onChange={(value) => {
              setSelectedDistributor(value);
              setPagination(prev => ({ ...prev, current: 1 }));
            }}
            style={{ 
              minWidth: '120px',
              maxWidth: '150px',
              width: 'clamp(120px, 15vw, 150px)'
            }}
            allowClear
          >
            {distributors.map(dist => (
              <Select.Option key={dist.id} value={dist.name}>
                {dist.name}
              </Select.Option>
            ))}
          </Select>

          {/* 物品类型筛选 */}
          <Select
            placeholder={t('itemBorrowRecords.allTypes')}
            value={selectedItemType || undefined}
            onChange={(value) => {
              setSelectedItemType(value);
              setPagination(prev => ({ ...prev, current: 1 }));
            }}
            style={{ 
              minWidth: '120px',
              maxWidth: '150px',
              width: 'clamp(120px, 15vw, 150px)'
            }}
            allowClear
          >
            {itemCategories.map(category => (
              <Select.Option key={category.id} value={category.name}>
                {category.name}
              </Select.Option>
            ))}
          </Select>

          {/* 状态筛选 */}
          <Select
            placeholder={t('itemBorrowRecords.allStatus')}
            value={selectedStatus}
            onChange={(value) => {
              setSelectedStatus(value);
              setPagination(prev => ({ ...prev, current: 1 }));
            }}
            style={{ 
              minWidth: '120px',
              maxWidth: '150px',
              width: 'clamp(120px, 15vw, 150px)'
            }}
            allowClear
          >
            <Select.Option value="">{t('itemBorrowRecords.allStatus')}</Select.Option>
            <Select.Option value="BORROWED">{t('itemBorrowRecords.notReturned')}</Select.Option>
            <Select.Option value="RETURNED">{t('itemBorrowRecords.returned')}</Select.Option>
          </Select>

          {/* 日期范围筛选 */}
          <DatePicker.RangePicker
            value={dateRange}
            onChange={(dates) => {
              setDateRange(dates as [Dayjs, Dayjs] | null);
              setPagination(prev => ({ ...prev, current: 1 }));
            }}
            style={{ 
              minWidth: '200px',
              maxWidth: '250px',
              width: 'clamp(200px, 25vw, 250px)'
            }}
            placeholder={[t('itemBorrowRecords.startDate'), t('itemBorrowRecords.endDate')]}
          />

          {/* 操作按钮组 */}
          <Space 
            size="small"
            style={{
              flexWrap: 'wrap',
              justifyContent: 'flex-end'
            }}
          >
            <Button 
              icon={<ReloadOutlined />} 
              onClick={loadBorrowRecords}
              loading={loading}
              size="small"
            >
              {t('common.refresh')}
            </Button>
            <Button 
              type="primary" 
              icon={<DownloadOutlined />} 
              onClick={() => setExportModalVisible(true)}
              size="small"
            >
              {selectedRowKeys.length > 0 ? t('itemBorrowRecords.exportSelected').replace('{count}', selectedRowKeys.length.toString()) : t('itemBorrowRecords.exportAll')}
            </Button>
          </Space>
        </div>
      </div>

      {/* 筛选结果统计 */}
      {!loading && (searchKeyword.trim() || selectedDistributor || selectedItemType || selectedStatus || dateRange) && (
        <div style={{ 
          marginBottom: 8, 
          padding: '8px 12px', 
          background: '#f5f5f5', 
          borderRadius: '4px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: '#666', fontSize: '13px' }}>
              {t('itemBorrowRecords.filterResults').replace('{count}', filteredData.length.toString())}
              {borrowRecords.length !== filteredData.length && (
                <span style={{ marginLeft: 6, color: '#999' }}>
                  {t('itemBorrowRecords.fromTotalRecords').replace('{total}', borrowRecords.length.toString())}
                </span>
              )}
            </span>
          </div>
          <Button 
            size="small" 
            onClick={() => {
              setSearchKeyword('')
              setSelectedDistributor('')
              setSelectedItemType('')
              setSelectedStatus('')
              setDateRange(null)
              setPagination(prev => ({ ...prev, current: 1 }));
            }}
          >
            {t('common.clearFilters')}
          </Button>
        </div>
      )}

      {/* 选择状态显示 */}
      {selectedRowKeys.length > 0 && (
        <div style={{ 
          marginBottom: 8, 
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
            {t('itemBorrowRecords.selectedRecords').replace('{count}', selectedRowKeys.length.toString())}
            {selectedRowKeys.length > 0 && (
              <span style={{ color: '#999', marginLeft: '8px' }}>
                / {t('itemBorrowRecords.totalRecords').replace('{count}', paginatedData.length.toString())}
              </span>
            )}
          </span>
          <Button 
            onClick={() => setSelectedRowKeys([])}
            size="small"
          >
            {t('itemBorrowRecords.clearSelection').replace('{count}', selectedRowKeys.length.toString())}
          </Button>
        </div>
      )}

      {/* 物品借用记录表格 */}
      <Card style={{ 
        margin: 0,
        height: 'calc(100vh - 200px)', 
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
          {/* 表格容器 */}
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            minHeight: 0, 
            padding: '8px 16px 0 16px', // 顶部添加8px间距
            marginBottom: selectedRowKeys.length > 0 ? 0 : 0 // 根据是否有批量操作栏调整底部间距
          }}>
            <Table
              columns={columns}
              dataSource={paginatedData}
              rowKey="key"
              loading={loading}
              scroll={{ 
                x: 1400,
                y: selectedRowKeys.length > 0 
                  ? 'calc(100vh - 348px)' // 有批量操作栏时减少高度，考虑顶部间距
                  : 'calc(100vh - 308px)' // 没有批量操作栏时正常高度，考虑顶部间距
              }}
              pagination={false} // 禁用内置分页，使用自定义分页
              size="middle"
              tableLayout="fixed" // 固定表格布局，避免对齐延迟
              style={{ 
                fontSize: '14px',
                height: '100%'
              }}
              rowSelection={{
                selectedRowKeys,
                onChange: setSelectedRowKeys,
                preserveSelectedRowKeys: true
              }}
              locale={{
                emptyText: loading ? '加载中...' : '暂无数据'
              }}
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
              current={pagination.current}
              pageSize={pagination.pageSize}
              total={pagination.total}
              showSizeChanger
              showQuickJumper
              showTotal={(total, range) => 
                t('itemBorrowRecords.paginationInfo')
                  .replace('{start}', range[0].toString())
                  .replace('{end}', range[1].toString())
                  .replace('{total}', total.toString())
              }
              pageSizeOptions={['10', '20', '50', '100']}
              onChange={(page, pageSize) => {
                setPagination({ ...pagination, current: page, pageSize });
              }}
              onShowSizeChange={(_, size) => {
                setPagination({ ...pagination, current: 1, pageSize: size });
              }}
              size="small"
              style={{ 
                margin: 0
              }}
            />
          </div>
        </div>
      </Card>

      {/* 详情弹窗 */}
      <Modal
        title={t('itemBorrowRecords.detailTitle').replace('{itemCode}', selectedRecord?.itemCode || '')}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            {t('itemBorrowRecords.close')}
          </Button>
        ]}
        width={600}
      >
        {selectedRecord && (
          <div>
            <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <strong>{t('itemBorrowRecords.workerNameLabel')}</strong>{selectedRecord.workerName}
                </Col>
                <Col span={12}>
                  <strong>{t('itemBorrowRecords.workerIdLabel')}</strong>{selectedRecord.workerId}
                </Col>
                <Col span={12} style={{ marginTop: 8 }}>
                  <strong>{t('itemBorrowRecords.distributorLabel')}</strong>{selectedRecord.distributorName}
                </Col>
                <Col span={12} style={{ marginTop: 8 }}>
                  <strong>{t('itemBorrowRecords.siteLabel')}</strong>{selectedRecord.siteName}
                </Col>
              </Row>
            </div>
            
            <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <strong>{t('itemBorrowRecords.itemCodeLabel')}</strong>{selectedRecord.itemCode}
                </Col>
                <Col span={12}>
                  <strong>{t('itemBorrowRecords.itemTypeLabel')}</strong>{selectedRecord.itemType}
                </Col>
                <Col span={12} style={{ marginTop: 8 }}>
                  <strong>{t('itemBorrowRecords.borrowDateLabel')}</strong>{selectedRecord.borrowDate}
                </Col>
                <Col span={12} style={{ marginTop: 8 }}>
                  <strong>{t('itemBorrowRecords.borrowTimeLabel')}</strong>{selectedRecord.borrowTime}
                </Col>
                <Col span={12} style={{ marginTop: 8 }}>
                  <strong>{t('itemBorrowRecords.borrowHandlerLabel')}</strong>{selectedRecord.borrowHandlerName || t('itemBorrowRecords.notSpecified')}
                </Col>
                {selectedRecord.returnDate && (
                  <Col span={12} style={{ marginTop: 8 }}>
                    <strong>{t('itemBorrowRecords.returnTimeLabel')}</strong>{formatReturnTime(selectedRecord)}
                  </Col>
                )}
                <Col span={12} style={{ marginTop: 8 }}>
                  <strong>{t('itemBorrowRecords.statusLabel')}</strong>
                  <Tag color={selectedRecord.status === 'RETURNED' ? 'green' : 'orange'} style={{ marginLeft: 8 }}>
                    {selectedRecord.status === 'RETURNED' ? t('itemBorrowRecords.returned') : t('itemBorrowRecords.notReturned')}
                  </Tag>
                </Col>
                {selectedRecord.borrowDuration && (
                  <Col span={12} style={{ marginTop: 8 }}>
                    <strong>{t('itemBorrowRecords.borrowDurationLabel')}</strong>{formatBorrowDuration(selectedRecord.borrowDuration)}
                  </Col>
                )}
                {selectedRecord.notes && (
                  <Col span={24} style={{ marginTop: 12 }}>
                    <div>
                      <strong>{t('itemBorrowRecords.notesLabel') || '备注'}</strong>
                    </div>
                    <div style={{
                      backgroundColor: '#fffbe6',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      borderLeft: '3px solid #faad14',
                      marginTop: '4px',
                      wordBreak: 'break-word'
                    }}>
                      {selectedRecord.notes}
                    </div>
                  </Col>
                )}
              </Row>
            </div>
          </div>
        )}
      </Modal>

      {/* 导出选项模态框 */}
      <Modal
        title={t('itemBorrowRecords.exportOptionsTitle')}
        open={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setExportModalVisible(false)}>
            {t('common.cancel')}
          </Button>,
          <Button 
            key="exportAll" 
            type="primary" 
            onClick={() => {
              setExportModalVisible(false)
              exportToExcel()
            }}
          >
            {t('itemBorrowRecords.exportAll')}
          </Button>,
          selectedRowKeys.length > 0 && (
            <Button 
              key="exportSelected" 
              type="primary" 
              onClick={() => {
                setExportModalVisible(false)
                exportToExcel()
              }}
            >
              {t('itemBorrowRecords.exportSelected').replace('{count}', selectedRowKeys.length.toString())}
            </Button>
          )
        ].filter(Boolean)}
        width={500}
      >
        <div style={{ marginTop: 16 }}>
          <p style={{ marginBottom: 16, color: '#666' }}>
            {t('itemBorrowRecords.exportOptionsDescription')}
          </p>
          
          <div style={{ 
            background: '#f5f5f5', 
            padding: '12px 16px', 
            borderRadius: '6px', 
            marginBottom: 16 
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
              {t('itemBorrowRecords.exportAll')}
            </div>
            <div style={{ color: '#666', fontSize: '14px' }}>
              {t('itemBorrowRecords.exportAllDescription').replace('{count}', filteredData.length.toString())}
            </div>
          </div>
          
          {selectedRowKeys.length > 0 && (
            <div style={{ 
              background: '#e6f7ff', 
              padding: '12px 16px', 
              borderRadius: '6px', 
              border: '1px solid #91d5ff' 
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: 8, color: '#1890ff' }}>
                {t('itemBorrowRecords.exportSelected').replace('{count}', selectedRowKeys.length.toString())}
              </div>
              <div style={{ color: '#666', fontSize: '14px' }}>
                {t('itemBorrowRecords.exportSelectedDescription')}
              </div>
            </div>
          )}
          
          <div style={{ 
            marginTop: 16, 
            padding: '12px', 
            background: '#fff7e6', 
            border: '1px solid #ffd591', 
            borderRadius: '6px',
            fontSize: '12px',
            color: '#666'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: 4, color: '#fa8c16' }}>
              💡 {t('itemBorrowRecords.exportTips')}:
            </div>
            <div>• {t('itemBorrowRecords.exportTip1')}</div>
            <div>• {t('itemBorrowRecords.exportTip2')}</div>
            <div>• {t('itemBorrowRecords.exportTip3')}</div>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default ItemBorrowRecords
