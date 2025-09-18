import React, { useMemo, useState, useEffect } from 'react'
import { Card, Table, Space, Button, Row, Col, message, Select, Input, DatePicker, Tag, Modal, Spin } from 'antd'
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
  borrowDuration?: number // 借用时长（小时）
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
  const { t } = useLocale()
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
  
  // 数据状态
  const [borrowRecords, setBorrowRecords] = useState<ItemBorrowRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [distributors, setDistributors] = useState<any[]>([])
  const [itemCategories, setItemCategories] = useState<any[]>([])

  // 加载物品借用记录
  const loadBorrowRecords = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const filters: any = {}
      
      // 根据用户角色选择不同的API
      if (user.role === 'ADMIN') {
        if (selectedSiteId) filters.siteId = selectedSiteId
        if (selectedStatus) filters.status = selectedStatus
        if (dateRange && dateRange[0] && dateRange[1]) {
          filters.startDate = dateRange[0].format('YYYY-MM-DD')
          filters.endDate = dateRange[1].format('YYYY-MM-DD')
        }
        
        const records = await apiService.getAllBorrowRecords(filters)
        const transformedRecords = records.map(transformBorrowRecord)
        setBorrowRecords(transformedRecords)
      } else if (user.role === 'GUARD') {
        if (selectedStatus) filters.status = selectedStatus
        
        const records = await apiService.getGuardSiteBorrowRecords(filters)
        const transformedRecords = records.map(transformBorrowRecord)
        setBorrowRecords(transformedRecords)
      }
    } catch (error) {
      console.error('加载物品借用记录失败:', error)
      message.error('加载数据失败')
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

    return filtered
  }, [borrowRecords, searchKeyword, selectedDistributor, selectedItemType])


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
      // 准备导出数据
      const exportData = dataToExport.map(record => ({
        [t('itemBorrowRecords.borrowDate')]: record.borrowDate,
        [t('itemBorrowRecords.workerName')]: record.workerName,
        [t('itemBorrowRecords.physicalCardId')]: record.physicalCardId || '-',
        [t('itemBorrowRecords.distributor')]: record.distributorName,
        [t('itemBorrowRecords.siteName')]: record.siteName,
        [t('itemBorrowRecords.itemType')]: record.itemType,
        [t('itemBorrowRecords.itemCode')]: record.itemCode,
        [t('itemBorrowRecords.borrowTime')]: record.borrowTime,
        [t('itemBorrowRecords.notes') || '备注']: record.notes || '-',
        [t('itemBorrowRecords.returnDate')]: record.returnDate || '-',
        [t('itemBorrowRecords.returnTime')]: record.returnTime || '-',
        [t('itemBorrowRecords.status')]: record.status === 'BORROWED' ? t('itemBorrowRecords.notReturned') : t('itemBorrowRecords.returned'),
        [t('itemBorrowRecords.borrowDuration')]: record.borrowDuration ? `${record.borrowDuration}小时` : '-',
        [t('itemBorrowRecords.borrowHandler')]: record.borrowHandlerName || '-'
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
        { wch: 12 }, // 归还日期
        { wch: 10 }, // 归还时间
        { wch: 10 }, // 状态
        { wch: 12 }, // 借用时长
        { wch: 15 }  // 借用经办人
      ]
      worksheet['!cols'] = colWidths
      
      // 添加工作表
      XLSX.utils.book_append_sheet(workbook, worksheet, t('itemBorrowRecords.title'))
      
      // 生成文件名并下载
      const fileName = `物品借用记录_${new Date().toISOString().split('T')[0]}.xlsx`
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
      width: 100,
      sorter: (a: ItemBorrowRecord, b: ItemBorrowRecord) => dayjs(a.borrowDate).unix() - dayjs(b.borrowDate).unix()
    },
    { 
      title: t('itemBorrowRecords.workerName'), 
      dataIndex: 'workerName', 
      key: 'workerName', 
      width: 120,
      sorter: (a: ItemBorrowRecord, b: ItemBorrowRecord) => a.workerName.localeCompare(b.workerName)
    },
    { 
      title: t('itemBorrowRecords.physicalCardId'), 
      dataIndex: 'physicalCardId', 
      key: 'physicalCardId', 
      width: 120,
      sorter: (a: ItemBorrowRecord, b: ItemBorrowRecord) => (a.physicalCardId || '').localeCompare(b.physicalCardId || '')
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
      width: 100,
      sorter: (a: ItemBorrowRecord, b: ItemBorrowRecord) => (a.returnTime || '').localeCompare(b.returnTime || ''),
      render: (time: string) => time || '-'
    },
    { 
      title: t('itemBorrowRecords.status'), 
      dataIndex: 'status', 
      key: 'status', 
      width: 100,
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
      width: 100,
      sorter: (a: ItemBorrowRecord, b: ItemBorrowRecord) => (a.borrowDuration || 0) - (b.borrowDuration || 0),
      render: (duration: number) => duration ? `${duration}${t('itemBorrowRecords.hours')}` : '-'
    },
    {
      title: t('itemBorrowRecords.actions'),
      key: 'actions',
      width: 100,
      render: (_: any, record: ItemBorrowRecord) => (
        <Button 
          type="link" 
          icon={<EyeOutlined />} 
          onClick={() => showDetail(record)}
          size="small"
        >
          {t('itemBorrowRecords.viewDetail')}
        </Button>
      )
    }
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* 页面标题和工地筛选 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
            {t('itemBorrowRecords.title')}
          </h2>
          <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '14px' }}>
            {t('itemBorrowRecords.description')}
          </p>
        </div>
      </div>

      {/* 筛选器 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={4}>
            <div style={{ marginBottom: 8 }}>{t('itemBorrowRecords.search')}</div>
            <Input.Search
              placeholder={t('itemBorrowRecords.searchPlaceholder')}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onSearch={setSearchKeyword}
              allowClear
              enterButton={<SearchOutlined />}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <div style={{ marginBottom: 8 }}>{t('itemBorrowRecords.distributor')}</div>
            <Select
              placeholder={t('itemBorrowRecords.allDistributors')}
              value={selectedDistributor}
              onChange={setSelectedDistributor}
              style={{ width: '100%' }}
              allowClear
              loading={distributors.length === 0}
            >
              {distributors.map(dist => (
                <Select.Option key={dist.id} value={dist.name}>
                  {dist.name}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <div style={{ marginBottom: 8 }}>{t('itemBorrowRecords.itemType')}</div>
            <Select
              placeholder={t('itemBorrowRecords.allTypes')}
              value={selectedItemType}
              onChange={setSelectedItemType}
              style={{ width: '100%' }}
              allowClear
              loading={itemCategories.length === 0}
            >
              {itemCategories.map(category => (
                <Select.Option key={category.id} value={category.name}>
                  {category.name}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <div style={{ marginBottom: 8 }}>{t('itemBorrowRecords.status')}</div>
            <Select
              placeholder={t('itemBorrowRecords.allStatus')}
              value={selectedStatus}
              onChange={setSelectedStatus}
              style={{ width: '100%' }}
              allowClear
            >
              <Select.Option value="BORROWED">{t('itemBorrowRecords.notReturned')}</Select.Option>
              <Select.Option value="RETURNED">{t('itemBorrowRecords.returned')}</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <div style={{ marginBottom: 8 }}>{t('itemBorrowRecords.borrowDate')}</div>
            <DatePicker.RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
              style={{ width: '100%' }}
              placeholder={[t('itemBorrowRecords.startDate'), t('itemBorrowRecords.endDate')]}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <div style={{ marginBottom: 8 }}>{t('itemBorrowRecords.actions')}</div>
            <Space>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={loadBorrowRecords}
                loading={loading}
              >
                {t('common.refresh')}
              </Button>
              <Button 
                type="primary" 
                icon={<DownloadOutlined />} 
                onClick={() => setExportModalVisible(true)}
              >
                {selectedRowKeys.length > 0 ? t('itemBorrowRecords.exportSelected').replace('{count}', selectedRowKeys.length.toString()) : t('itemBorrowRecords.exportAll')}
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 数据表格 */}
      <Card>
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={filteredData}
            rowKey="key"
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
              preserveSelectedRowKeys: true
            }}
            pagination={{
              total: filteredData.length,
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => t('itemBorrowRecords.paginationInfo').replace('{start}', range[0].toString()).replace('{end}', range[1].toString()).replace('{total}', total.toString())
            }}
            scroll={{ x: 1400 }}
            size="small"
            locale={{
              emptyText: loading ? '加载中...' : '暂无数据'
            }}
          />
        </Spin>
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
                  <>
                    <Col span={12} style={{ marginTop: 8 }}>
                      <strong>{t('itemBorrowRecords.returnDateLabel')}</strong>{selectedRecord.returnDate}
                    </Col>
                    <Col span={12} style={{ marginTop: 8 }}>
                      <strong>{t('itemBorrowRecords.returnTimeLabel')}</strong>{selectedRecord.returnTime}
                    </Col>
                  </>
                )}
                <Col span={12} style={{ marginTop: 8 }}>
                  <strong>{t('itemBorrowRecords.statusLabel')}</strong>
                  <Tag color={selectedRecord.status === 'RETURNED' ? 'green' : 'orange'} style={{ marginLeft: 8 }}>
                    {selectedRecord.status === 'RETURNED' ? t('itemBorrowRecords.returned') : t('itemBorrowRecords.notReturned')}
                  </Tag>
                </Col>
                {selectedRecord.borrowDuration && (
                  <Col span={12} style={{ marginTop: 8 }}>
                    <strong>{t('itemBorrowRecords.borrowDurationLabel')}</strong>{selectedRecord.borrowDuration}{t('itemBorrowRecords.hours')}
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
