import React, { useMemo, useState } from 'react'
import { Card, Table, Space, Button, Row, Col, message, Select, Input, DatePicker, Tag, Modal, List } from 'antd'
import { SearchOutlined, DownloadOutlined, EyeOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { useLocale } from '../contexts/LocaleContext'
import { mockWorkers, mockSites, mockDistributors } from '../data/mockData'

interface ItemBorrowRecord {
  key: string
  workerId: string
  workerName: string
  distributorName: string
  siteName: string
  itemName: string
  itemType: string
  physicalCardId?: string
  borrowDate: string
  borrowTime: string
  returnDate?: string
  returnTime?: string
  status: 'borrowed' | 'returned'
  borrowDuration?: number // 借用时长（小时）
}

// 生成物品借用记录数据
const generateItemBorrowRecords = (): ItemBorrowRecord[] => {
  const itemTypes = ['门禁卡', '钥匙', '梯子', '安全帽', '工具包', '防护服', '手套', '护目镜']
  const records: ItemBorrowRecord[] = []
  
  mockWorkers.slice(0, 12).forEach((worker, workerIdx) => {
    const siteIndex = workerIdx % mockSites.length
    const distIndex = workerIdx % mockDistributors.length
    const borrowedItems = Math.floor(Math.random() * 5) + 1 // 1-5个借用物品
    const returnedItems = Math.floor(Math.random() * (borrowedItems + 1)) // 0到借用数量的已归还数量
    
    for (let i = 0; i < borrowedItems; i++) {
      const itemType = itemTypes[i % itemTypes.length]
      const isReturned = i < returnedItems
      const borrowDate = dayjs().subtract(workerIdx % 7, 'day').format('YYYY-MM-DD')
      const borrowTime = dayjs().hour(8).minute(30 + (i % 10)).format('HH:mm')
      const returnTime = isReturned ? dayjs().hour(17 + (i % 2)).minute(10).format('HH:mm') : undefined
      
      records.push({
        key: `${worker.id}-item-${i}`,
        workerId: worker.workerId,
        workerName: worker.name,
        distributorName: mockDistributors[distIndex]?.name || `分判商${distIndex + 1}`,
        siteName: mockSites[siteIndex]?.name || `工地${siteIndex + 1}`,
        itemName: `${itemType} #${i + 1}`,
        itemType: itemType,
        physicalCardId: worker.physicalCardId,
        borrowDate: borrowDate,
        borrowTime: borrowTime,
        returnDate: isReturned ? borrowDate : undefined,
        returnTime: returnTime,
        status: isReturned ? 'returned' : 'borrowed',
        borrowDuration: isReturned ? Math.floor(Math.random() * 8) + 1 : undefined
      })
    }
  })
  
  return records
}

const mockItemBorrowRecords = generateItemBorrowRecords()

const ItemBorrowRecords: React.FC = () => {
  const { t } = useLocale()
  const [searchKeyword, setSearchKeyword] = useState<string>('')
  const [selectedSite, setSelectedSite] = useState<string>(mockSites[0]?.id || '')
  const [selectedDistributor, setSelectedDistributor] = useState<string>('')
  const [selectedItemType, setSelectedItemType] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false)
  const [selectedRecord, setSelectedRecord] = useState<ItemBorrowRecord | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  // 筛选后的数据
  const filteredData = useMemo(() => {
    let filtered = mockItemBorrowRecords

    // 搜索关键词筛选
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase()
      filtered = filtered.filter(record => 
        record.workerName.toLowerCase().includes(keyword) ||
        record.workerId.toLowerCase().includes(keyword) ||
        record.itemName.toLowerCase().includes(keyword) ||
        record.itemType.toLowerCase().includes(keyword)
      )
    }

    // 工地筛选
    if (selectedSite) {
      const site = mockSites.find(s => s.id === selectedSite)
      if (site) {
        filtered = filtered.filter(record => record.siteName === site.name)
      }
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

    // 日期范围筛选
    if (dateRange && dateRange[0] && dateRange[1]) {
      filtered = filtered.filter(record => {
        const recordDate = dayjs(record.borrowDate)
        return recordDate.isAfter(dateRange[0].subtract(1, 'day')) && 
               recordDate.isBefore(dateRange[1].add(1, 'day'))
      })
    }

    return filtered
  }, [searchKeyword, selectedSite, selectedDistributor, selectedItemType, selectedStatus, dateRange])


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
      message.warning('没有数据可导出')
      return
    }
    
    const exportType = selectedRowKeys.length > 0 ? '已选' : '全部'
    message.success(`物品借用记录${exportType}数据Excel文件下载中...`)
    // 这里应该调用实际的Excel导出API，传入dataToExport
  }

  // 表格列定义
  const columns = [
    { 
      title: '借用日期', 
      dataIndex: 'borrowDate', 
      key: 'borrowDate', 
      width: 100,
      sorter: (a: ItemBorrowRecord, b: ItemBorrowRecord) => dayjs(a.borrowDate).unix() - dayjs(b.borrowDate).unix()
    },
    { 
      title: '工人姓名', 
      dataIndex: 'workerName', 
      key: 'workerName', 
      width: 120 
    },
    { 
      title: '实体卡ID', 
      dataIndex: 'physicalCardId', 
      key: 'physicalCardId', 
      width: 120 
    },
    { 
      title: '分判商', 
      dataIndex: 'distributorName', 
      key: 'distributorName', 
      width: 140 
    },
    { 
      title: '物品类型', 
      dataIndex: 'itemType', 
      key: 'itemType', 
      width: 100 
    },
    { 
      title: '物品名称', 
      dataIndex: 'itemName', 
      key: 'itemName', 
      width: 140 
    },
    { 
      title: '借用时间', 
      dataIndex: 'borrowTime', 
      key: 'borrowTime', 
      width: 100 
    },
    { 
      title: '归还时间', 
      dataIndex: 'returnTime', 
      key: 'returnTime', 
      width: 100,
      render: (time: string) => time || '-'
    },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status', 
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'returned' ? 'green' : 'orange'}>
          {status === 'returned' ? '已归还' : '未归还'}
        </Tag>
      )
    },
    { 
      title: '借用时长', 
      dataIndex: 'borrowDuration', 
      key: 'borrowDuration', 
      width: 100,
      render: (duration: number) => duration ? `${duration}小时` : '-'
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_: any, record: ItemBorrowRecord) => (
        <Button 
          type="link" 
          icon={<EyeOutlined />} 
          onClick={() => showDetail(record)}
          size="small"
        >
          查看详情
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
            物品借用记录管理
          </h2>
          <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '14px' }}>
            查看和管理所有物品借用记录
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <div style={{ marginBottom: 4, fontSize: '14px', color: '#666' }}>工地选择</div>
            <Select
              placeholder="请选择工地"
              value={selectedSite}
              onChange={setSelectedSite}
              style={{ width: 200 }}
            >
              {mockSites.map(site => (
                <Select.Option key={site.id} value={site.id}>
                  {site.name}
                </Select.Option>
              ))}
            </Select>
          </div>
        </div>
      </div>


      {/* 筛选器 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={4}>
            <div style={{ marginBottom: 8 }}>搜索</div>
            <Input.Search
              placeholder="工人姓名、编号、物品名称"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onSearch={setSearchKeyword}
              allowClear
              enterButton={<SearchOutlined />}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <div style={{ marginBottom: 8 }}>分判商</div>
            <Select
              placeholder="全部分判商"
              value={selectedDistributor}
              onChange={setSelectedDistributor}
              style={{ width: '100%' }}
              allowClear
            >
              {mockDistributors.map(dist => (
                <Select.Option key={dist.id} value={dist.name}>
                  {dist.name}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <div style={{ marginBottom: 8 }}>物品类型</div>
            <Select
              placeholder="全部类型"
              value={selectedItemType}
              onChange={setSelectedItemType}
              style={{ width: '100%' }}
              allowClear
            >
              {['门禁卡', '钥匙', '梯子', '安全帽', '工具包', '防护服', '手套', '护目镜'].map(type => (
                <Select.Option key={type} value={type}>
                  {type}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <div style={{ marginBottom: 8 }}>状态</div>
            <Select
              placeholder="全部状态"
              value={selectedStatus}
              onChange={setSelectedStatus}
              style={{ width: '100%' }}
              allowClear
            >
              <Select.Option value="borrowed">未归还</Select.Option>
              <Select.Option value="returned">已归还</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <div style={{ marginBottom: 8 }}>借用日期</div>
            <DatePicker.RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates)}
              style={{ width: '100%' }}
              placeholder={['开始日期', '结束日期']}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <div style={{ marginBottom: 8 }}>操作</div>
            <Space>
              <Button 
                type="primary" 
                icon={<DownloadOutlined />} 
                onClick={exportToExcel}
              >
                {selectedRowKeys.length > 0 ? `导出已选(${selectedRowKeys.length})` : '导出全部'}
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 数据表格 */}
      <Card>
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
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`
          }}
          scroll={{ x: 1400 }}
          size="small"
        />
      </Card>

      {/* 详情弹窗 */}
      <Modal
        title={`物品借用详情 - ${selectedRecord?.itemName}`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={600}
      >
        {selectedRecord && (
          <div>
            <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <strong>工人姓名：</strong>{selectedRecord.workerName}
                </Col>
                <Col span={12}>
                  <strong>工人编号：</strong>{selectedRecord.workerId}
                </Col>
                <Col span={12} style={{ marginTop: 8 }}>
                  <strong>分判商：</strong>{selectedRecord.distributorName}
                </Col>
                <Col span={12} style={{ marginTop: 8 }}>
                  <strong>工地：</strong>{selectedRecord.siteName}
                </Col>
              </Row>
            </div>
            
            <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <strong>物品名称：</strong>{selectedRecord.itemName}
                </Col>
                <Col span={12}>
                  <strong>物品类型：</strong>{selectedRecord.itemType}
                </Col>
                <Col span={12} style={{ marginTop: 8 }}>
                  <strong>借用日期：</strong>{selectedRecord.borrowDate}
                </Col>
                <Col span={12} style={{ marginTop: 8 }}>
                  <strong>借用时间：</strong>{selectedRecord.borrowTime}
                </Col>
                {selectedRecord.returnDate && (
                  <>
                    <Col span={12} style={{ marginTop: 8 }}>
                      <strong>归还日期：</strong>{selectedRecord.returnDate}
                    </Col>
                    <Col span={12} style={{ marginTop: 8 }}>
                      <strong>归还时间：</strong>{selectedRecord.returnTime}
                    </Col>
                  </>
                )}
                <Col span={12} style={{ marginTop: 8 }}>
                  <strong>状态：</strong>
                  <Tag color={selectedRecord.status === 'returned' ? 'green' : 'orange'} style={{ marginLeft: 8 }}>
                    {selectedRecord.status === 'returned' ? '已归还' : '未归还'}
                  </Tag>
                </Col>
                {selectedRecord.borrowDuration && (
                  <Col span={12} style={{ marginTop: 8 }}>
                    <strong>借用时长：</strong>{selectedRecord.borrowDuration}小时
                  </Col>
                )}
              </Row>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default ItemBorrowRecords
