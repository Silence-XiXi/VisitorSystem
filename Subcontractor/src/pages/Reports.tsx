import React, { useMemo, useState, useEffect, useRef } from 'react'
import { Card, DatePicker, Table, Space, Button, Row, Col, Statistic, message, Progress, Select, Tabs, Input, Tooltip, Modal, List, Tag } from 'antd'
import { TeamOutlined, DownloadOutlined, SearchOutlined, QuestionCircleOutlined, ShoppingOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { useLocale } from '../contexts/LocaleContext'
import { useSiteFilter } from '../contexts/SiteFilterContext'
import { mockWorkers, mockSites, mockDistributors, mockItemCategories, mockGuards } from '../data/mockData'

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
  borrowedItems: number
  returnedItems: number
  registrarId?: string // 登记人ID
  registrarName?: string // 登记人姓名
}

interface SiteSummary {
  siteId: string
  siteName: string
  totalWorkers: number
  checkedIn: number
  checkedOut: number
  currentOnSite: number
}

// 生成基础访客记录
const baseAttendance: AttendanceRecord[] = mockWorkers.slice(0, 12).map((w, idx) => {
  const siteIndex = idx % mockSites.length
  const distIndex = idx % mockDistributors.length
  const idTypes = ['身份证', '护照', '港澳通行证', '台湾通行证']
  const borrowedItems = Math.floor(Math.random() * 5) + 1 // 1-5个借用物品
  const returnedItems = Math.floor(Math.random() * (borrowedItems + 1)) // 0到借用数量的已归还数量
  
  // 获取该工地对应的门卫作为登记人
  const siteGuards = mockGuards.filter(guard => guard.siteId === mockSites[siteIndex]?.id)
  const randomGuard = siteGuards.length > 0 ? siteGuards[Math.floor(Math.random() * siteGuards.length)] : null
  
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
    checkOut: idx % 4 === 0 ? undefined : dayjs().hour(17 + (idx % 2)).minute(10).format('HH:mm'),
    borrowedItems,
    returnedItems,
    registrarId: randomGuard?.guardId,
    registrarName: randomGuard?.name || '未指定'
  }
})

// 为北京CBD项目生成额外的访客记录
const generateBeijingCBDRecords = (): AttendanceRecord[] => {
  const beijingCBDWorkers = [
    { name: '王建国', workerId: 'BJ001', phone: '13800138001', idCard: '110101198001011234', physicalCardId: 'CARD001' },
    { name: '李小明', workerId: 'BJ002', phone: '13800138002', idCard: '110101198002021234', physicalCardId: 'CARD002' },
    { name: '张伟', workerId: 'BJ003', phone: '13800138003', idCard: '110101198003031234', physicalCardId: 'CARD003' },
    { name: '刘强', workerId: 'BJ004', phone: '13800138004', idCard: '110101198004041234', physicalCardId: 'CARD004' },
    { name: '陈华', workerId: 'BJ005', phone: '13800138005', idCard: '110101198005051234', physicalCardId: 'CARD005' },
    { name: '赵军', workerId: 'BJ006', phone: '13800138006', idCard: '110101198006061234', physicalCardId: 'CARD006' },
    { name: '孙丽', workerId: 'BJ007', phone: '13800138007', idCard: '110101198007071234', physicalCardId: 'CARD007' },
    { name: '周涛', workerId: 'BJ008', phone: '13800138008', idCard: '110101198008081234', physicalCardId: 'CARD008' },
    { name: '吴敏', workerId: 'BJ009', phone: '13800138009', idCard: '110101198009091234', physicalCardId: 'CARD009' },
    { name: '郑强', workerId: 'BJ010', phone: '13800138010', idCard: '110101198010101234', physicalCardId: 'CARD010' },
    { name: '马超', workerId: 'BJ011', phone: '13800138011', idCard: '110101198011111234', physicalCardId: 'CARD011' },
    { name: '朱亮', workerId: 'BJ012', phone: '13800138012', idCard: '110101198012121234', physicalCardId: 'CARD012' },
    { name: '许峰', workerId: 'BJ013', phone: '13800138013', idCard: '110101198101011234', physicalCardId: 'CARD013' },
    { name: '何勇', workerId: 'BJ014', phone: '13800138014', idCard: '110101198102021234', physicalCardId: 'CARD014' },
    { name: '罗斌', workerId: 'BJ015', phone: '13800138015', idCard: '110101198103031234', physicalCardId: 'CARD015' }
  ]
  
  const idTypes = ['身份证', '护照', '港澳通行证', '台湾通行证']
  const beijingCBDGuards = mockGuards.filter(guard => guard.siteId === '1') // 北京CBD项目ID为'1'
  
  return beijingCBDWorkers.map((worker, idx) => {
    const borrowedItems = Math.floor(Math.random() * 5) + 1
    const returnedItems = Math.floor(Math.random() * (borrowedItems + 1))
    const randomGuard = beijingCBDGuards.length > 0 ? beijingCBDGuards[Math.floor(Math.random() * beijingCBDGuards.length)] : null
    
    return {
      key: `beijing-cbd-${idx}`,
      workerId: worker.workerId,
      name: worker.name,
      distributorName: '北京建筑公司',
      siteName: '北京CBD项目',
      contact: worker.phone,
      idType: idTypes[idx % idTypes.length],
      idNumber: worker.idCard,
      physicalCardId: worker.physicalCardId,
      date: dayjs().subtract(idx % 10, 'day').format('YYYY-MM-DD'),
      checkIn: dayjs().hour(7 + (idx % 3)).minute(30 + (idx % 30)).format('HH:mm'),
      checkOut: idx % 5 === 0 ? undefined : dayjs().hour(16 + (idx % 3)).minute(10 + (idx % 50)).format('HH:mm'),
      borrowedItems,
      returnedItems,
      registrarId: randomGuard?.guardId,
      registrarName: randomGuard?.name || '未指定'
    }
  })
}

const mockAttendance: AttendanceRecord[] = [...baseAttendance, ...generateBeijingCBDRecords()]

const Reports: React.FC = () => {
  const { t } = useLocale()
  const { selectedSiteId } = useSiteFilter()
  const [dateType, setDateType] = useState<'single' | 'range'>('single')
  const [singleDate, setSingleDate] = useState<Dayjs>(dayjs())
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf('week'), dayjs().endOf('week')])
  const [selectedDistributors, setSelectedDistributors] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<string>('visitor-records')
  const [searchKeyword, setSearchKeyword] = useState<string>('')
  const [itemDetailModalVisible, setItemDetailModalVisible] = useState<boolean>(false)
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null)
  const [tableHeight, setTableHeight] = useState(400)
  const [pageSize, setPageSize] = useState(20)
  const [currentPage, setCurrentPage] = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)

  // 计算表格高度
  const calculateTableHeight = () => {
    const windowHeight = window.innerHeight
    const headerHeight = 64 // Dashboard header高度
    const statsCardsHeight = 120 // 统计数据卡片高度
    const filterCardHeight = 120 // 筛选器Card高度
    const tabsHeight = 46 // Tabs组件高度
    const paginationHeight = 90 // 分页组件高度（为小屏幕增加预留空间）
    const padding = 80 // 上下padding和margin
    
    // 计算可用高度
    const availableHeight = windowHeight - headerHeight - statsCardsHeight - filterCardHeight - tabsHeight - paginationHeight - padding
    
    // 根据屏幕尺寸动态调整表格高度
    let finalHeight = 300
    
    if (windowHeight >= 1400) { // 超大屏幕（如27寸4K，1440p及以上）
      // 超大屏幕充分利用空间，几乎填满整个可用区域
      finalHeight = Math.max(1000, availableHeight + 40)
    } else if (windowHeight >= 1200) { // 大屏幕（如27寸1080p，24寸1440p）
      // 大屏幕充分利用空间，但保留少量边距
      finalHeight = Math.max(800, availableHeight + 20)
    } else if (windowHeight >= 900) { // 中等屏幕（如24寸1080p）
      // 中等屏幕使用大部分可用空间
      finalHeight = Math.max(600, availableHeight + 10)
    } else if (windowHeight >= 600) { // 小屏幕（如笔记本）
      // 小屏幕使用适中空间，确保筛选框可见且分页栏不超出
      finalHeight = Math.max(400, availableHeight - 50)
    } else { // 很小屏幕（如平板）
      // 很小屏幕保持最小可用空间，确保筛选框可见且分页栏不超出
      finalHeight = Math.max(300, availableHeight - 60)
    }
    
    // 添加调试信息
    console.log('屏幕高度:', windowHeight, '可用高度:', availableHeight, '最终高度:', finalHeight)
    
    setTableHeight(finalHeight)
  }

  // 监听窗口大小变化
  useEffect(() => {
    calculateTableHeight()
    window.addEventListener('resize', calculateTableHeight)
    return () => window.removeEventListener('resize', calculateTableHeight)
  }, [])

  // 生成物品数据
  const generateItemData = (record: AttendanceRecord) => {
    const itemTypes = ['门禁卡', '钥匙', '梯子', '安全帽', '工具包', '防护服', '手套', '护目镜']
    const items = []
    
    for (let i = 0; i < record.borrowedItems; i++) {
      const itemType = itemTypes[i % itemTypes.length]
      const isReturned = i < record.returnedItems
      
      // 根据物品类型找到对应的分类
      const category = mockItemCategories.find(cat => 
        cat.name === itemType || 
        (itemType === '门禁卡' && cat.name === '门禁卡') ||
        (itemType === '钥匙' && cat.name === '钥匙') ||
        (itemType === '梯子' && cat.name === '梯子') ||
        (itemType === '安全帽' && cat.name === '安全帽') ||
        (itemType === '工具包' && cat.name === '工具包') ||
        (itemType === '防护服' && cat.name === '防护服') ||
        (itemType === '手套' && cat.name === '手套') ||
        (itemType === '护目镜' && cat.name === '护目镜')
      )
      
      items.push({
        id: `${record.key}-item-${i}`,
        name: `${itemType} #${i + 1}`,
        type: itemType,
        category: category?.name || '未分类',
        categoryDescription: category?.description || '暂无描述',
        borrowedTime: record.checkIn || '08:30',
        returnedTime: isReturned ? (record.checkOut || '17:00') : null,
        status: isReturned ? 'returned' : 'borrowed',
        borrowHandler: record.registrarName || '未指定'
      })
    }
    
    return items
  }

  // 显示物品详情
  const showItemDetail = (record: AttendanceRecord) => {
    setSelectedRecord(record)
    setItemDetailModalVisible(true)
  }

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
    
    if (selectedSiteId) {
      filtered = filtered.filter(site => site.siteId === selectedSiteId)
    }
    
    return filtered
  }, [siteSummaries, selectedSiteId])

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
        (record.physicalCardId && record.physicalCardId.toLowerCase().includes(keyword)) ||
        (record.registrarName && record.registrarName.toLowerCase().includes(keyword))
      )
    }
    
    if (selectedSiteId) {
      const site = mockSites.find(s => s.id === selectedSiteId)
      if (site) {
        filtered = filtered.filter(record => record.siteName === site.name)
      }
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
  }, [searchKeyword, selectedSiteId, selectedDistributors])

  // 计算各种统计数据 - 只与工地筛选框联动
  const siteOnlyFilteredData = useMemo(() => {
    if (!selectedSiteId) return []
    const site = mockSites.find(s => s.id === selectedSiteId)
    if (!site) return []
    return mockAttendance.filter(record => record.siteName === site.name)
  }, [selectedSiteId])

  const pending = siteOnlyFilteredData.filter(r => !r.checkOut) // 未离场人数
  const totalEntered = siteOnlyFilteredData.filter(r => !!r.checkIn).length // 当日进场人数
  const currentOnSite = siteOnlyFilteredData.filter(r => !!r.checkIn && !r.checkOut).length // 当前在场人数
  
  // 物品统计数据
  const totalBorrowedItems = siteOnlyFilteredData.reduce((sum, r) => sum + r.borrowedItems, 0) // 已借出物品总数
  const totalReturnedItems = siteOnlyFilteredData.reduce((sum, r) => sum + r.returnedItems, 0) // 已归还物品总数
  const totalUnreturnedItems = totalBorrowedItems - totalReturnedItems // 未归还物品总数

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
    { title: '工地名称', dataIndex: 'siteName', key: 'siteName', width: 150, sorter: (a: SiteSummary, b: SiteSummary) => a.siteName.localeCompare(b.siteName) },
    { title: '总工人数', dataIndex: 'totalWorkers', key: 'totalWorkers', width: 100, sorter: (a: SiteSummary, b: SiteSummary) => a.totalWorkers - b.totalWorkers },
    { title: '已进场', dataIndex: 'checkedIn', key: 'checkedIn', width: 100, sorter: (a: SiteSummary, b: SiteSummary) => a.checkedIn - b.checkedIn },
    { title: '已离场', dataIndex: 'checkedOut', key: 'checkedOut', width: 100, sorter: (a: SiteSummary, b: SiteSummary) => a.checkedOut - b.checkedOut },
    { title: '当前在场', dataIndex: 'currentOnSite', key: 'currentOnSite', width: 100, sorter: (a: SiteSummary, b: SiteSummary) => a.currentOnSite - b.currentOnSite },
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
    { title: '日期', dataIndex: 'date', key: 'date', width: 90, fixed: 'left' as const, sorter: (a: AttendanceRecord, b: AttendanceRecord) => a.date.localeCompare(b.date) },
    { title: t('worker.name'), dataIndex: 'name', key: 'name', width: 100, fixed: 'left' as const, sorter: (a: AttendanceRecord, b: AttendanceRecord) => a.name.localeCompare(b.name) },
    { title: t('reports.distributor'), dataIndex: 'distributorName', key: 'distributorName', width: 120, sorter: (a: AttendanceRecord, b: AttendanceRecord) => a.distributorName.localeCompare(b.distributorName) },
    { title: '联系方式', dataIndex: 'contact', key: 'contact', width: 120, sorter: (a: AttendanceRecord, b: AttendanceRecord) => a.contact.localeCompare(b.contact) },
    { title: '证件类型', dataIndex: 'idType', key: 'idType', width: 100, sorter: (a: AttendanceRecord, b: AttendanceRecord) => a.idType.localeCompare(b.idType) },
    { title: '证件号码', dataIndex: 'idNumber', key: 'idNumber', width: 160, sorter: (a: AttendanceRecord, b: AttendanceRecord) => a.idNumber.localeCompare(b.idNumber) },
    { title: '实体卡ID', dataIndex: 'physicalCardId', key: 'physicalCardId', width: 100, sorter: (a: AttendanceRecord, b: AttendanceRecord) => (a.physicalCardId || '').localeCompare(b.physicalCardId || '') },
    { 
      title: '登记人', 
      dataIndex: 'registrarName', 
      key: 'registrarName', 
      width: 100,
      sorter: (a: AttendanceRecord, b: AttendanceRecord) => (a.registrarName || '').localeCompare(b.registrarName || ''),
      render: (name: string) => name || '-'
    },
    { 
      title: '进场时间', 
      key: 'checkIn', 
      width: 90,
      sorter: (a: AttendanceRecord, b: AttendanceRecord) => (a.checkIn || '').localeCompare(b.checkIn || ''),
      render: (_: any, record: AttendanceRecord) => {
        return record.checkIn || '-'
      }
    },
    { 
      title: '离场时间', 
      key: 'checkOut', 
      width: 90,
      sorter: (a: AttendanceRecord, b: AttendanceRecord) => (a.checkOut || '').localeCompare(b.checkOut || ''),
      render: (_: any, record: AttendanceRecord) => {
        return record.checkOut || '-'
      }
    },
    { 
      title: '借用物品', 
      key: 'borrowedItems', 
      width: 100,
      sorter: (a: AttendanceRecord, b: AttendanceRecord) => a.borrowedItems - b.borrowedItems,
      render: (_: any, record: AttendanceRecord) => {
        return (
          <span 
            style={{ 
              color: '#1890ff', 
              fontWeight: 'bold',
              backgroundColor: '#e6f7ff',
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid #91d5ff',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onClick={() => showItemDetail(record)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#bae7ff'
              e.currentTarget.style.borderColor = '#69c0ff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#e6f7ff'
              e.currentTarget.style.borderColor = '#91d5ff'
            }}
          >
            {record.borrowedItems}
          </span>
        )
      }
    },
    { 
      title: (
        <span>
          已归还
          <Tooltip 
            title={
              <div>
                <div>绿色：✅ 完全归还</div>
                <div>橙色：⚠️ 部分归还</div>
                <div>红色：❌ 未归还</div>
              </div>
            }
            placement="top"
          >
            <QuestionCircleOutlined 
              style={{ 
                marginLeft: 4, 
                color: '#1890ff', 
                cursor: 'help',
                fontSize: '12px'
              }} 
            />
          </Tooltip>
        </span>
      ), 
      key: 'returnedItems', 
      width: 100,
      sorter: (a: AttendanceRecord, b: AttendanceRecord) => a.returnedItems - b.returnedItems,
      render: (_: any, record: AttendanceRecord) => {
        const isPartiallyReturned = record.returnedItems > 0 && record.returnedItems < record.borrowedItems
        const isNotReturned = record.returnedItems === 0
        
        let color = '#52c41a' // 绿色 - 完全归还
        let backgroundColor = '#f6ffed'
        let borderColor = '#b7eb8f'
        
        if (isPartiallyReturned) {
          color = '#faad14' // 橙色 - 部分归还
          backgroundColor = '#fffbe6'
          borderColor = '#ffe58f'
        } else if (isNotReturned) {
          color = '#ff4d4f' // 红色 - 未归还
          backgroundColor = '#fff2f0'
          borderColor = '#ffccc7'
        }
        
        return (
          <span 
            style={{ 
              color, 
              fontWeight: 'bold',
              backgroundColor,
              padding: '2px 8px',
              borderRadius: '4px',
              border: `1px solid ${borderColor}`,
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onClick={() => showItemDetail(record)}
            onMouseEnter={(e) => {
              const currentBg = e.currentTarget.style.backgroundColor
              const currentBorder = e.currentTarget.style.borderColor
              e.currentTarget.style.backgroundColor = currentBg === 'rgb(246, 255, 237)' ? '#d9f7be' : 
                                                   currentBg === 'rgb(255, 251, 230)' ? '#ffe58f' : '#ffccc7'
              e.currentTarget.style.borderColor = currentBorder === 'rgb(183, 235, 143)' ? '#95de64' :
                                                currentBorder === 'rgb(255, 229, 143)' ? '#ffd666' : '#ffa39e'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = backgroundColor
              e.currentTarget.style.borderColor = borderColor
            }}
          >
            {record.returnedItems}
          </span>
        )
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

  // 分页事件处理
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (current: number, size: number) => {
    setCurrentPage(current)
    setPageSize(size)
  }

  return (
    <div 
      ref={containerRef}
      style={{ 
        padding: '0 24px 24px 24px',
        width: '100%',
        overflow: 'visible'
      }}>

      {/* 统计数据卡片 */}
      <Row gutter={8} style={{ marginBottom: 8 }}>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="当日进场人数"
              value={totalEntered}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#52c41a', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="当前在场人数"
              value={currentOnSite}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="未离场人数"
              value={pending.length}
              prefix={<TeamOutlined />}
              valueStyle={{ color: pending.length > 0 ? '#fa541c' : '#52c41a', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="已借出物品"
              value={totalBorrowedItems}
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: '#1890ff', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="已归还物品"
              value={totalReturnedItems}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="未归还物品"
              value={totalUnreturnedItems}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: totalUnreturnedItems > 0 ? '#fa541c' : '#52c41a', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选器 */}
      <Card style={{ marginBottom: 8 }}>
        <Row gutter={8} align="middle">
          <Col span={8}>
            <div style={{ marginBottom: 4 }}>日期选择</div>
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
                <div style={{ marginBottom: 4 }}>
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
          <Col span={8}>
            <div style={{ marginBottom: 4 }}>搜索工人</div>
            <Input.Search
              placeholder="姓名、工号、身份证号码、实体卡ID或登记人"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onSearch={setSearchKeyword}
              allowClear
              enterButton={<SearchOutlined />}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 4 }}>选择分判商</div>
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
              <div style={{ height: tableHeight, display: 'flex', flexDirection: 'column' }}>
                <Table
                  columns={attendanceColumns}
                  dataSource={filteredData}
                  rowKey="key"
                    scroll={{ x: 1200, y: tableHeight - 90 }}
                  pagination={{ 
                    current: currentPage,
                    pageSize: pageSize,
                    total: filteredData.length,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    onChange: handlePageChange,
                    onShowSizeChange: handlePageSizeChange
                  }}
                />
              </div>
            )
          },
          {
            key: 'site-summary',
            label: '工地访客统计',
            children: (
              <div style={{ height: tableHeight, display: 'flex', flexDirection: 'column' }}>
                <Table
                  columns={siteColumns}
                  dataSource={filteredSiteSummaries}
                  rowKey="siteId"
                  size="small"
                    scroll={{ x: 800, y: tableHeight - 90 }}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
                    pageSizeOptions: ['5', '10', '20'],
                    size: 'small'
                  }}
                />
              </div>
            )
          }
        ]}
      />

      {/* 物品详情弹窗 */}
      <Modal
        title={`${selectedRecord?.name} - 借用物品详情`}
        open={itemDetailModalVisible}
        onCancel={() => setItemDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setItemDetailModalVisible(false)}>
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
                  <strong>工人姓名：</strong>{selectedRecord.name}
                </Col>
                <Col span={12}>
                  <strong>分判商：</strong>{selectedRecord.distributorName}
                </Col>
                <Col span={12} style={{ marginTop: 8 }}>
                  <strong>进场时间：</strong>{selectedRecord.checkIn || '-'}
                </Col>
                <Col span={12} style={{ marginTop: 8 }}>
                  <strong>离场时间：</strong>{selectedRecord.checkOut || '-'}
                </Col>
              </Row>
            </div>
            
            <List
              dataSource={generateItemData(selectedRecord)}
              renderItem={(item: any) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{item.name}</span>
                        <Tag color={item.status === 'returned' ? 'green' : 'orange'}>
                          {item.status === 'returned' ? '已归还' : '未归还'}
                        </Tag>
                      </div>
                    }
                    description={
                      <div>
                        <div><strong>物品分类：</strong>{item.category}</div>
                        <div><strong>经办人：</strong>{item.borrowHandler}</div>
                        <div><strong>借用时间：</strong>{item.borrowedTime}</div>
                        <div><strong>归还时间：</strong>{item.returnedTime || '-'}</div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Reports
