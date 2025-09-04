import React, { useMemo, useState } from 'react'
import { Card, DatePicker, Table, Space, Button, Row, Col, Statistic, message, Progress, Select, Tabs, Input } from 'antd'
import { TeamOutlined, DownloadOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { useLocale } from '../contexts/LocaleContext'
import { mockWorkers, mockSites, mockDistributors } from '../data/mockData'

interface AttendanceRecord {
  key: string
  workerId: string
  name: string
  distributorName: string
  siteName: string
  contact: string
  idType: string
  idNumber: string
  physicalCardId?: string
  date: string
  checkIn?: string
  checkOut?: string
}

interface SiteSummary {
  siteId: string
  siteName: string
  totalWorkers: number
  checkedIn: number
  checkedOut: number
  currentOnSite: number
}

const mockAttendance: AttendanceRecord[] = mockWorkers.slice(0, 12).map((w, idx) => {
  const siteIndex = idx % mockSites.length
  const distIndex = idx % mockDistributors.length
  const idTypes = ['身份证', '护照', '港澳通行证', '台湾通行证']
  return {
    key: w.id,
    workerId: w.workerId,
    name: w.name,
    distributorName: mockDistributors[distIndex]?.name || `分判商${distIndex + 1}`,
    siteName: mockSites[siteIndex]?.name || `工地${siteIndex + 1}`,
    contact: idx % 2 === 0 ? w.phone : w.whatsapp,
    idType: idTypes[idx % idTypes.length],
    idNumber: w.idCard,
    physicalCardId: w.physicalCardId,
    date: dayjs().subtract(idx % 7, 'day').format('YYYY-MM-DD'),
    checkIn: dayjs().hour(8).minute(30 + (idx % 10)).format('HH:mm'),
    checkOut: idx % 4 === 0 ? undefined : dayjs().hour(17 + (idx % 2)).minute(10).format('HH:mm')
  }
})

const Reports: React.FC = () => {
  const { t } = useLocale()
  const [dateType, setDateType] = useState<'single' | 'range'>('single')
  const [singleDate, setSingleDate] = useState<Dayjs>(dayjs())
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf('week'), dayjs().endOf('week')])
  const [selectedSites, setSelectedSites] = useState<string[]>([])
  const [selectedDistributors, setSelectedDistributors] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<string>('visitor-records')
  const [searchKeyword, setSearchKeyword] = useState<string>('')

  // 生成工地汇总数据
  const siteSummaries = useMemo((): SiteSummary[] => {
    const siteMap = new Map<string, SiteSummary>()
    
    // 初始化所有工地
    mockSites.forEach(site => {
      siteMap.set(site.id, {
        siteId: site.id,
        siteName: site.name,
        totalWorkers: 0,
        checkedIn: 0,
        checkedOut: 0,
        currentOnSite: 0
      })
    })

    // 统计每个工地的数据
    mockAttendance.forEach(record => {
      // 根据工地名称找到对应的工地ID
      const site = mockSites.find(s => s.name === record.siteName)
      if (site) {
        const siteSummary = siteMap.get(site.id)
        if (siteSummary) {
          siteSummary.totalWorkers++
          if (record.checkIn) siteSummary.checkedIn++
          if (record.checkOut) siteSummary.checkedOut++
          // 计算当前在场人数：已进场但未离场
          if (record.checkIn && !record.checkOut) {
            siteSummary.currentOnSite++
          }
        }
      }
    })

    return Array.from(siteMap.values())
  }, [])

  // 筛选后的工地汇总数据
  const filteredSiteSummaries = useMemo(() => {
    let filtered = siteSummaries
    
    if (selectedSites.length > 0) {
      filtered = filtered.filter(site => selectedSites.includes(site.siteId))
    }
    
    return filtered
  }, [siteSummaries, selectedSites])

  // 筛选后的出勤数据
  const filteredData = useMemo(() => {
    let filtered = mockAttendance
    
    // 搜索关键词筛选
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase().trim()
      filtered = filtered.filter(record => 
        record.name.toLowerCase().includes(keyword) ||
        record.workerId.toLowerCase().includes(keyword) ||
        record.idNumber.toLowerCase().includes(keyword) ||
        (record.physicalCardId && record.physicalCardId.toLowerCase().includes(keyword))
      )
    }
    
    if (selectedSites.length > 0) {
      filtered = filtered.filter(record => 
        selectedSites.some(siteId => {
          const site = mockSites.find(s => s.id === siteId)
          return site && record.siteName === site.name
        })
      )
    }
    
    if (selectedDistributors.length > 0) {
      filtered = filtered.filter(record => 
        selectedDistributors.some(distId => {
          const dist = mockDistributors.find(d => d.id === distId)
          return dist && record.distributorName === dist.name
        })
      )
    }
    
    return filtered
  }, [searchKeyword, selectedSites, selectedDistributors])

  // 计算各种统计数据
  const pending = filteredData.filter(r => !r.checkOut) // 未离场人数
  const totalEntered = filteredData.filter(r => !!r.checkIn).length // 当日进场人数
  const currentOnSite = filteredData.filter(r => !!r.checkIn && !r.checkOut).length // 当前在场人数

  // Excel下载功能
  const downloadExcel = () => {
    if (activeTab === 'site-summary') {
      // 下载工地访客统计数据
      message.success('工地访客统计Excel文件下载中...')
      // 这里应该调用实际的Excel导出API，导出filteredSiteSummaries数据
    } else if (activeTab === 'visitor-records') {
      // 下载访客记录数据
      message.success('访客记录Excel文件下载中...')
      // 这里应该调用实际的Excel导出API，导出filteredData数据
    }
  }

  const siteColumns = [
    { title: '工地名称', dataIndex: 'siteName', key: 'siteName', width: 150 },
    { title: '总工人数', dataIndex: 'totalWorkers', key: 'totalWorkers', width: 100 },
    { title: '已进场', dataIndex: 'checkedIn', key: 'checkedIn', width: 100 },
    { title: '已离场', dataIndex: 'checkedOut', key: 'checkedOut', width: 100 },
    { title: '当前在场', dataIndex: 'currentOnSite', key: 'currentOnSite', width: 100 },
    { title: '在场和离场比例', key: 'onSiteAndLeftRatio', width: 150,
      render: (_: any, record: SiteSummary) => {
        const onSiteRate = record.totalWorkers > 0 ? Math.round((record.currentOnSite / record.totalWorkers) * 100) : 0
        const leftRate = record.totalWorkers > 0 ? Math.round((record.checkedOut / record.totalWorkers) * 100) : 0
        
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#666', minWidth: '40px' }}>在场:</span>
              <Progress 
                percent={onSiteRate} 
                size="small" 
                status="active"
                format={() => `${onSiteRate}%`}
                strokeColor="#1890ff"
                style={{ flex: 1 }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#666', minWidth: '40px' }}>离场:</span>
              <Progress 
                percent={leftRate} 
                size="small" 
                status="active"
                format={() => `${leftRate}%`}
                strokeColor="#52c41a"
                style={{ flex: 1 }}
              />
            </div>
          </div>
        )
      }
    }
  ]

  const attendanceColumns = [
    { title: '日期', dataIndex: 'date', key: 'date', width: 100 },
    { title: t('worker.workerId'), dataIndex: 'workerId', key: 'workerId', width: 120 },
    { title: t('worker.name'), dataIndex: 'name', key: 'name', width: 120 },
    { title: t('reports.distributor'), dataIndex: 'distributorName', key: 'distributorName', width: 140 },
    { title: t('reports.site'), dataIndex: 'siteName', key: 'siteName', width: 120 },
    { title: '联系方式', dataIndex: 'contact', key: 'contact', width: 140 },
    { title: '证件类型', dataIndex: 'idType', key: 'idType', width: 120 },
    { title: '证件号码', dataIndex: 'idNumber', key: 'idNumber', width: 180 },
    { title: '实体卡ID', dataIndex: 'physicalCardId', key: 'physicalCardId', width: 120 },
    { 
      title: '进场时间', 
      key: 'checkIn', 
      width: 120,
      render: (_: any, record: AttendanceRecord) => {
        return record.checkIn || '-'
      }
    },
    { 
      title: '离场时间', 
      key: 'checkOut', 
      width: 120,
      render: (_: any, record: AttendanceRecord) => {
        return record.checkOut || '-'
      }
    }
  ]

  // 移除 contactAll 函数
  // const contactAll = () => {
  //   if (pending.length === 0) {
  //     message.info('无未离场人员')
  //     return
  //   }
  //   pending.forEach((r, idx) => setTimeout(() => {
  //     // 实际中调用批量通知接口
  //     message.success(`已联系：${r.name}`)
  //   }, idx * 200))
  // }

  // 清空搜索
  const clearSearch = () => {
    setSearchKeyword('')
  }

  return (
    <div style={{ padding: 24 }}>
      {/* 统计数据卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="当日进场人数"
              value={totalEntered}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#52c41a', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="当前在场人数"
              value={currentOnSite}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="未离场人数"
              value={pending.length}
              prefix={<TeamOutlined />}
              valueStyle={{ color: pending.length > 0 ? '#fa541c' : '#52c41a', fontWeight: 700 }}
            />
          </Card>
        </Col>

      </Row>

      {/* 筛选器 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <div style={{ marginBottom: 8 }}>日期选择</div>
            {dateType === 'single' ? (
              <DatePicker 
                value={singleDate} 
                onChange={(d) => d && setSingleDate(d)} 
                style={{ width: '100%' }} 
                placeholder="选择日期"
                onOpenChange={(open) => {
                  if (open) {
                    // 当日期选择器打开时，显示模式切换选项
                    const pickerPanel = document.querySelector('.ant-picker-panel-container');
                    if (pickerPanel) {
                      const modeSwitch = document.createElement('div');
                      modeSwitch.style.cssText = `
                        padding: 8px 12px;
                        border-bottom: 1px solid #f0f0f0;
                        background: #fafafa;
                        cursor: pointer;
                        text-align: center;
                        color: #1890ff;
                        font-size: 12px;
                      `;
                      modeSwitch.textContent = '切换到范围选择';
                      modeSwitch.onclick = () => {
                        setDateType('range');
                        // 关闭当前选择器
                        const input = document.querySelector('.ant-picker-input input') as HTMLInputElement;
                        if (input) input.blur();
                      };
                      
                      // 检查是否已经添加过
                      if (!pickerPanel.querySelector('.mode-switch')) {
                        modeSwitch.className = 'mode-switch';
                        pickerPanel.insertBefore(modeSwitch, pickerPanel.firstChild);
                      }
                    }
                  }
                }}
              />
            ) : (
              <div>
                <div style={{ marginBottom: 8 }}>
                  <Space>
                    <Button 
                      size="small" 
                      onClick={() => setDateRange([dayjs().startOf('week'), dayjs().endOf('week')])}
                    >
                      本周
                    </Button>
                    <Button 
                      size="small" 
                      onClick={() => setDateRange([dayjs().startOf('month'), dayjs().endOf('month')])}
                    >
                      本月
                    </Button>
                    <Button 
                      size="small" 
                      onClick={() => setDateRange([dayjs().subtract(7, 'day'), dayjs()])}
                    >
                      最近7天
                    </Button>
                  </Space>
                </div>
                <DatePicker.RangePicker
                  value={dateRange}
                  onChange={(dates) => {
                    if (dates && dates[0] && dates[1]) {
                      setDateRange([dates[0], dates[1]])
                    }
                  }}
                  style={{ width: '100%' }}
                  placeholder={['开始日期', '结束日期']}
                  onOpenChange={(open) => {
                    if (open) {
                      // 当范围选择器打开时，显示模式切换选项
                      const pickerPanel = document.querySelector('.ant-picker-panel-container');
                      if (pickerPanel) {
                        const modeSwitch = document.createElement('div');
                        modeSwitch.style.cssText = `
                          padding: 8px 12px;
                          border-bottom: 1px solid #f0f0f0;
                          background: #fafafa;
                          cursor: pointer;
                          text-align: center;
                          color: #1890ff;
                          font-size: 12px;
                        `;
                        modeSwitch.textContent = '切换到单日选择';
                        modeSwitch.onclick = () => {
                          setDateType('single');
                          // 关闭当前选择器
                          const input = document.querySelector('.ant-picker-range input') as HTMLInputElement;
                          if (input) input.blur();
                        };
                        
                        // 检查是否已经添加过
                        if (!pickerPanel.querySelector('.mode-switch')) {
                          modeSwitch.className = 'mode-switch';
                          pickerPanel.insertBefore(modeSwitch, pickerPanel.firstChild);
                        }
                      }
                    }
                  }}
                />
              </div>
            )}
          </Col>
          <Col span={6}>
            <div style={{ marginBottom: 8 }}>搜索工人</div>
            <Input.Search
              placeholder="姓名、工号、身份证号码或实体卡ID"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onSearch={setSearchKeyword}
              allowClear
              enterButton={<SearchOutlined />}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={6}>
            <div style={{ marginBottom: 8 }}>选择工地</div>
            <Select
              mode="multiple"
              placeholder="全部工地"
              value={selectedSites}
              onChange={setSelectedSites}
              style={{ width: '100%' }}
              options={mockSites.map(site => ({ label: site.name, value: site.id }))}
              allowClear
            />
          </Col>
          <Col span={6}>
            <div style={{ marginBottom: 8 }}>选择分判商</div>
            <Select
              mode="multiple"
              placeholder="全部分判商"
              value={selectedDistributors}
              onChange={setSelectedDistributors}
              style={{ width: '100%' }}
              options={mockDistributors.map(dist => ({ label: dist.name, value: dist.id }))}
              allowClear
            />
          </Col>
        </Row>
        {/* 搜索结果显示 */}
        {searchKeyword.trim() && (
          <Row style={{ marginTop: 16 }}>
            <Col span={24}>
              <div style={{ 
                padding: '8px 12px', 
                background: '#f6ffed', 
                border: '1px solid #b7eb8f', 
                borderRadius: '6px',
                color: '#52c41a'
              }}>
                搜索结果：找到 <strong>{filteredData.length}</strong> 条记录
                {searchKeyword.trim() && (
                  <Button 
                    type="link" 
                    size="small" 
                    onClick={clearSearch}
                    style={{ marginLeft: 8, padding: 0, height: 'auto' }}
                  >
                    清空搜索
                  </Button>
                )}
              </div>
            </Col>
          </Row>
        )}
      </Card>

      {/* 数据表格选项卡 */}
      <Card>
        <Tabs
          defaultActiveKey="visitor-records"
          activeKey={activeTab}
          onChange={setActiveTab}
          tabBarExtraContent={
            <Button 
              type="primary" 
              icon={<DownloadOutlined />} 
              onClick={downloadExcel}
            >
              下载Excel
            </Button>
          }
          items={[
            {
              key: 'visitor-records',
              label: '访客记录',
              children: (
                <Table
                  columns={attendanceColumns}
                  dataSource={filteredData}
                  rowKey="key"
                  pagination={{ 
                    pageSize: 20, 
                    showSizeChanger: true,
                    showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`
                  }}
                />
              )
            },
            {
              key: 'site-summary',
              label: '工地访客统计',
              children: (
                <Table
                  columns={siteColumns}
                  dataSource={filteredSiteSummaries}
                  rowKey="siteId"
                  pagination={false}
                  size="small"
                />
              )
            }
          ]}
        />
      </Card>
    </div>
  )
}

export default Reports
