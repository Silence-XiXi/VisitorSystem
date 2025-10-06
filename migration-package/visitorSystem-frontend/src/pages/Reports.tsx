import React, { useMemo, useState, useEffect, useRef } from 'react'
import { Card, DatePicker, Table, Space, Button, Row, Col, Statistic, message, Progress, Select, Tabs, Input, Tooltip, Modal, List, Tag, Spin } from 'antd'
import { TeamOutlined, DownloadOutlined, SearchOutlined, ReloadOutlined, QuestionCircleOutlined, ShoppingOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import dayjs from '../utils/dayjs'
type Dayjs = ReturnType<typeof dayjs>
import { useLocale } from '../contexts/LocaleContext'
import { useSiteFilter } from '../contexts/SiteFilterContext'
import apiService from '../services/api'
import * as XLSX from 'xlsx'

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
  date: string // 入场日期
  checkIn?: string // 入场时间
  checkOut?: string // 离场时间
  checkOutDate?: string // 离场日期
  borrowedItems: number
  returnedItems: number
  registrarId?: string // 登记人ID
  registrarName?: string // 登记人姓名
  visitorRecordId?: string // 访客记录ID，用于关联借物记录
}

interface SiteSummary {
  siteId: string
  siteName: string
  totalWorkers: number
  checkedIn: number
  checkedOut: number
  currentOnSite: number
}

// 计算工人今日相关物品数量（今日借出+未归还+今日归还）
const calculateTodayRelatedItems = (workerId: string, borrowRecords: any[]): { borrowedItems: number, returnedItems: number } => {
  const today = dayjs().format('YYYY-MM-DD')
  
  // 获取该工人的所有借用记录
  const workerBorrowRecords = borrowRecords.filter(record => record.worker.workerId === workerId)
  
  // 1. 借用日期是今日的物品（无论是否归还）
  const todayBorrowedItems = workerBorrowRecords.filter(item => {
    if (!item.borrowDate) return false
    const borrowDate = dayjs(item.borrowDate).format('YYYY-MM-DD')
    return borrowDate === today
  })
  
  // 2. 当前所有未归还的物品（无论借用日期）
  const allUnreturnedItems = workerBorrowRecords.filter(item => item.status === 'BORROWED')
  
  // 3. 归还时间是今日的物品（无论借用日期）
  const todayReturnedItems = workerBorrowRecords.filter(item => {
    if (item.status !== 'RETURNED' || !item.returnDate) return false
    const returnDate = dayjs(item.returnDate).format('YYYY-MM-DD')
    return returnDate === today
  })
  
  // 合并三种类型的物品，去重（使用Set来避免重复计算同一个物品）
  const allTodayRelatedItems = new Set([
    ...todayBorrowedItems.map(item => item.id),
    ...allUnreturnedItems.map(item => item.id),
    ...todayReturnedItems.map(item => item.id)
  ])
  
  const totalTodayRelatedItems = allTodayRelatedItems.size
  const totalTodayReturnedItems = todayReturnedItems.length
  
  return {
    borrowedItems: totalTodayRelatedItems,
    returnedItems: totalTodayReturnedItems
  }
}

// 将访客记录和借用记录转换为AttendanceRecord格式
const convertToAttendanceRecords = (visitorRecords: any[], borrowRecords: any[]): AttendanceRecord[] => {
  const recordMap = new Map<string, AttendanceRecord>()
  // 按工人分组的访客记录
  const workerVisitorMap = new Map<string, any[]>()
  
  // 首先将访客记录按工人ID分组
  visitorRecords.forEach(record => {
    const workerId = record.worker.workerId
    if (!workerVisitorMap.has(workerId)) {
      workerVisitorMap.set(workerId, [])
    }
    workerVisitorMap.get(workerId)?.push(record)
  })
  
  // 处理访客记录
  visitorRecords.forEach(record => {
    const key = `${record.worker.workerId}-${dayjs(record.checkInTime).format('YYYY-MM-DD')}`
    const existingRecord = recordMap.get(key)
    
    // 计算该工人今日相关物品数量
    const todayRelatedItems = calculateTodayRelatedItems(record.worker.workerId, borrowRecords)
    
    if (existingRecord) {
      // 如果已存在记录，更新离场信息
      if (record.checkOutTime) {
        existingRecord.checkOut = dayjs(record.checkOutTime).format('HH:mm')
        existingRecord.checkOutDate = dayjs(record.checkOutTime).format('YYYY-MM-DD') // 保存离场日期
      }
      existingRecord.registrarId = record.registrar?.id
      existingRecord.registrarName = record.registrar?.name || '未指定'
      // 更新今日相关物品数量
      existingRecord.borrowedItems = todayRelatedItems.borrowedItems
      existingRecord.returnedItems = todayRelatedItems.returnedItems
    } else {
      // 创建新记录
      recordMap.set(key, {
        key,
        workerId: record.worker.workerId,
        name: record.worker.name,
        distributorName: record.worker.distributor?.name || '未知分判商',
        siteName: record.site?.name || '未知工地',
        contact: record.phone || record.worker.phone || record.worker.whatsapp || '',
        idType: record.idType,
        idNumber: record.idNumber,
        physicalCardId: record.physicalCardId,
        date: dayjs(record.checkInTime).format('YYYY-MM-DD'),
        checkIn: dayjs(record.checkInTime).format('HH:mm'),
        checkOut: record.checkOutTime ? dayjs(record.checkOutTime).format('HH:mm') : undefined,
        checkOutDate: record.checkOutTime ? dayjs(record.checkOutTime).format('YYYY-MM-DD') : undefined, // 保存离场日期
        borrowedItems: todayRelatedItems.borrowedItems, // 使用今日相关物品数量
        returnedItems: todayRelatedItems.returnedItems, // 使用今日归还物品数量
        registrarId: record.registrar?.id,
        registrarName: record.registrar?.name || '未指定',
        visitorRecordId: record.id // 存储访客记录ID用于后续关联
      })
    }
  })
  
  // 注意：借用记录处理逻辑已被新的calculateTodayRelatedItems函数替代
  // 现在借用物品和归还物品的数量在访客记录处理时直接计算
  // 这样可以确保显示的是今日相关物品的总数量（今日借出+未归还+今日归还）
  
  return Array.from(recordMap.values())
}

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
  const [itemDetailModalType, setItemDetailModalType] = useState<'todayRelated' | 'todayReturned'>('todayRelated')
  const [tableHeight, setTableHeight] = useState(400)
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [downloadModalVisible, setDownloadModalVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 数据状态
  const [visitorRecords, setVisitorRecords] = useState<any[]>([])
  const [borrowRecords, setBorrowRecords] = useState<any[]>([])
  const [sites, setSites] = useState<any[]>([])
  const [distributors, setDistributors] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // 加载数据
  const loadData = async () => {
    setLoading(true)
    try {
      // 准备日期参数，确保不会有null值
      const startDateParam = dateType === 'single' ? singleDate.format('YYYY-MM-DD') : dateRange[0].format('YYYY-MM-DD');
      const endDateParam = dateType === 'single' ? singleDate.format('YYYY-MM-DD') : dateRange[1].format('YYYY-MM-DD');
      
      // 检查是否是今天的日期
      const today = dayjs().format('YYYY-MM-DD');
      const isToday = (dateType === 'single' && startDateParam === today) || 
                      (dateType === 'range' && startDateParam === today && endDateParam === today);
      
      let visitorData = [];
      
      if (isToday) {
        // 今日特殊处理：优化为一次性获取所有满足条件的记录
        // 使用新的API参数获取符合"今日入场或今日离场或未离场"条件的所有记录
        const allTodayRelevantRecords = await apiService.getVisitorRecords({
          siteId: selectedSiteId || undefined,
          todayRelevant: true  // 使用后端新支持的参数，一次获取所有相关记录
        });
        
        visitorData = allTodayRelevantRecords;
      } else {
        // 非今日，使用常规筛选
        visitorData = await apiService.getVisitorRecords({
          siteId: selectedSiteId || undefined,
          startDate: startDateParam,
          endDate: endDateParam
        });
      }
      
      // 借物记录不再按日期过滤，确保可以显示所有工人的借物记录
      const [borrowData, sitesData, distributorsData] = await Promise.all([
        apiService.getAllBorrowRecords({
          siteId: selectedSiteId || undefined
          // 移除日期参数，获取所有借用记录
        }),
        apiService.getAllSites(),
        apiService.getAllDistributors()
      ]);
      
      setVisitorRecords(visitorData)
      setBorrowRecords(borrowData)
      setSites(sitesData)
      setDistributors(distributorsData)
    } catch (error) {
      // console.error('加载数据失败:', error)
      message.error('加载数据失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  // 监听筛选条件变化，重新加载数据
  useEffect(() => {
    loadData()
  }, [selectedSiteId, singleDate, dateRange, dateType])

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
    
    // // 添加调试信息
    // console.log('屏幕高度:', windowHeight, '可用高度:', availableHeight, '最终高度:', finalHeight)
    
    setTableHeight(finalHeight)
  }

  // 监听窗口大小变化
  useEffect(() => {
    calculateTableHeight()
    window.addEventListener('resize', calculateTableHeight)
    return () => window.removeEventListener('resize', calculateTableHeight)
  }, [])

  // 生成物品数据（根据弹窗类型）
  const generateItemData = (record: AttendanceRecord) => {
    const today = dayjs().format('YYYY-MM-DD')
    
    // 获取该工人的所有借用记录
    const workerBorrowRecords = borrowRecords.filter(borrowRecord => {
      const workerIdMatches = 
        (borrowRecord.worker?.workerId === record.workerId) ||
        (borrowRecord.worker?.id === record.workerId) ||
        (borrowRecord.workerId === record.workerId);
      return workerIdMatches;
    });
    
    let filteredRecords: any[] = []
    
    if (itemDetailModalType === 'todayRelated') {
      // 今日相关物品：借用日期是今日的 + 当前所有未归还的 + 归还时间是今日的
      const todayBorrowedItems = workerBorrowRecords.filter(item => {
        if (!item.borrowDate) return false
        const borrowDate = dayjs(item.borrowDate).format('YYYY-MM-DD')
        return borrowDate === today
      })
      
      const allUnreturnedItems = workerBorrowRecords.filter(item => item.status === 'BORROWED')
      
      const todayReturnedItems = workerBorrowRecords.filter(item => {
        if (item.status !== 'RETURNED' || !item.returnDate) return false
        const returnDate = dayjs(item.returnDate).format('YYYY-MM-DD')
        return returnDate === today
      })
      
      // 合并三种类型的物品，去重
      const allTodayRelatedItems = new Set([
        ...todayBorrowedItems.map(item => item.id),
        ...allUnreturnedItems.map(item => item.id),
        ...todayReturnedItems.map(item => item.id)
      ])
      
      filteredRecords = workerBorrowRecords.filter(item => allTodayRelatedItems.has(item.id))
    } else if (itemDetailModalType === 'todayReturned') {
      // 今日归还物品：归还时间是今日的物品
      filteredRecords = workerBorrowRecords.filter(item => {
        if (item.status !== 'RETURNED' || !item.returnDate) return false
        const returnDate = dayjs(item.returnDate).format('YYYY-MM-DD')
        return returnDate === today
      })
    }
    
    return filteredRecords.map((borrowRecord, index) => ({
      id: borrowRecord.id,
      name: borrowRecord.item?.name || `物品 #${index + 1}`,
      type: borrowRecord.item?.category?.name || t('reports.uncategorized'),
      category: borrowRecord.item?.category?.name || t('reports.uncategorized'),
      categoryDescription: borrowRecord.item?.category?.description || t('reports.noDescription'),
      borrowedTime: dayjs(borrowRecord.borrowDate).format('YYYY-MM-DD HH:mm'),
      returnedTime: borrowRecord.status === 'RETURNED' && borrowRecord.returnDate ? 
        dayjs(borrowRecord.returnDate).format('YYYY-MM-DD HH:mm') : null,
      status: borrowRecord.status === 'RETURNED' ? 'returned' : 'borrowed',
      borrowHandler: borrowRecord.borrowHandler?.name || record.registrarName || t('reports.unspecified'),
      notes: borrowRecord.notes || ''
    }))
  }

  // 显示今日相关物品详情（点击借用物品列）
  const showTodayRelatedItemDetail = (record: AttendanceRecord) => {
    setSelectedRecord(record)
    setItemDetailModalType('todayRelated')
    setItemDetailModalVisible(true)
  }

  // 显示今日归还物品详情（点击已归还列）
  const showTodayReturnedItemDetail = (record: AttendanceRecord) => {
    setSelectedRecord(record)
    setItemDetailModalType('todayReturned')
    setItemDetailModalVisible(true)
  }


  // 将真实数据转换为AttendanceRecord格式
  const attendanceRecords = useMemo(() => {
    return convertToAttendanceRecords(visitorRecords, borrowRecords)
  }, [visitorRecords, borrowRecords])

  // 生成工地汇总数据
  const siteSummaries = useMemo((): SiteSummary[] => {
    const siteMap = new Map<string, SiteSummary>()
    
    // 初始化所有工地
    sites.forEach(site => {
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
    attendanceRecords.forEach(record => {
      // 根据工地名称找到对应的工地ID
      const site = sites.find(s => s.name === record.siteName)
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
  }, [sites, attendanceRecords])

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
    let filtered = attendanceRecords
    
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
      const site = sites.find(s => s.id === selectedSiteId)
      if (site) {
        filtered = filtered.filter(record => record.siteName === site.name)
      }
    }
    
    if (selectedDistributors.length > 0) {
      filtered = filtered.filter(record => 
        selectedDistributors.some(distId => {
          const dist = distributors.find(d => d.id === distId)
          return dist && record.distributorName === dist.name
        })
      )
    }
    
    // 根据选择的日期过滤记录
    const today = dayjs().format('YYYY-MM-DD');
    const startDateParam = dateType === 'single' ? singleDate.format('YYYY-MM-DD') : dateRange[0].format('YYYY-MM-DD');
    const endDateParam = dateType === 'single' ? singleDate.format('YYYY-MM-DD') : dateRange[1].format('YYYY-MM-DD');
    const isToday = (dateType === 'single' && startDateParam === today) || 
                    (dateType === 'range' && startDateParam === today && endDateParam === today);
    
    filtered = filtered.filter(record => {
      const entryDate = record.date;
      const exitDate = record.checkOutDate || record.date;
      const hasNoExitTime = !record.checkOut; // 未离场标志
      
      if (isToday) {
        // 如果选择的是今天，显示入场时间或离场时间至少有一个是今日，或者未离场的记录
        return entryDate === today || exitDate === today || hasNoExitTime;
      } else {
        // 如果选择的不是今天，只显示入场日期在选择范围内的记录
        if (dateType === 'range') {
          // 日期范围：入场日期在起始日期和结束日期之间
          return entryDate >= startDateParam && entryDate <= endDateParam;
        } else {
          // 单一日期：入场日期等于所选日期
          return entryDate === startDateParam;
        }
      }
    })
    
    return filtered
  }, [attendanceRecords, searchKeyword, selectedSiteId, selectedDistributors, sites, distributors, dateType, singleDate, dateRange])

  // 计算各种统计数据 - 只与工地筛选框联动
  const siteOnlyFilteredData = useMemo(() => {
    if (!selectedSiteId) return []
    const site = sites.find(s => s.id === selectedSiteId)
    if (!site) return []
    return attendanceRecords.filter(record => record.siteName === site.name)
  }, [selectedSiteId, sites, attendanceRecords])
  
  // 获取当前选择的日期 - 在统计卡片标题中不再使用，但保留注释以便将来可能需要时参考
  // const selectedDateStr = dateType === 'single' 
  //   ? singleDate.format('YYYY-MM-DD') 
  //   : `${dateRange[0].format('YYYY-MM-DD')} - ${dateRange[1].format('YYYY-MM-DD')}`;
  
  // 筛选出入场日期在所选日期范围内的记录
  const dateFilteredRecords = useMemo(() => {
    // 如果是日期范围
    if (dateType === 'range') {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');
      return siteOnlyFilteredData.filter(record => {
        const recordDate = record.date;
        return recordDate >= startDate && recordDate <= endDate;
      });
    } 
    // 如果是单日
    else {
      const dateStr = singleDate.format('YYYY-MM-DD');
      return siteOnlyFilteredData.filter(record => record.date === dateStr);
    }
  }, [siteOnlyFilteredData, dateType, singleDate, dateRange]);

  const pending = siteOnlyFilteredData.filter(r => !r.checkOut) // 未离场人数
  const totalEntered = dateFilteredRecords.filter(r => !!r.checkIn).length // 选定日期进场人数
  const leftCount = dateFilteredRecords.filter(r => !!r.checkIn && !!r.checkOut).length // 选定日期已离场人数
  
  // 物品统计数据
  // 获取今天的日期
  const today = dayjs().format('YYYY-MM-DD')
  
  // 筛选今日借出的物品记录
  const todayBorrowRecords = borrowRecords.filter(record => {
    const borrowDate = dayjs(record.borrowDate).format('YYYY-MM-DD')
    return borrowDate === today
  })
  
  // 统计今日借出的物品数量
  const totalBorrowedItems = todayBorrowRecords.length
  
  // 统计今日借出且已归还的物品数量
  const totalReturnedItems = todayBorrowRecords.filter(record => record.status === 'RETURNED').length
  
  // 统计所有未归还的物品数量(不限于今日)
  const totalUnreturnedItems = borrowRecords.filter(record => record.status !== 'RETURNED').length

  // Excel下载功能
  const downloadExcel = () => {
    try {
      if (activeTab === 'site-summary') {
        // 下载工地访客统计数据
        const exportData = filteredSiteSummaries.map(site => ({
          [t('reports.siteName')]: site.siteName,
          [t('reports.totalWorkers')]: site.totalWorkers,
          [t('reports.checkedIn')]: site.checkedIn,
          [t('reports.checkedOut')]: site.checkedOut,
          [t('reports.currentOnSite')]: site.currentOnSite,
          [t('reports.checkInRate')]: `${((site.checkedIn / site.totalWorkers) * 100).toFixed(1)}%`,
          [t('reports.checkOutRate')]: `${((site.checkedOut / site.totalWorkers) * 100).toFixed(1)}%`
        }))
        
        const workbook = XLSX.utils.book_new()
        const worksheet = XLSX.utils.json_to_sheet(exportData)
        
        // 设置列宽
        const colWidths = [
          { wch: 20 }, // 工地名称
          { wch: 12 }, // 总工人数
          { wch: 12 }, // 已签到
          { wch: 12 }, // 已签退
          { wch: 12 }, // 当前在场
          { wch: 12 }, // 签到率
          { wch: 12 }  // 签退率
        ]
        worksheet['!cols'] = colWidths
        
        XLSX.utils.book_append_sheet(workbook, worksheet, t('reports.siteSummary'))
        
        const fileName = `工地访客统计_${new Date().toISOString().split('T')[0]}.xlsx`
        XLSX.writeFile(workbook, fileName)
        
        message.success(t('reports.downloadVisitorStats').replace('{count}', filteredSiteSummaries.length.toString()))
      } else if (activeTab === 'visitor-records') {
        // 下载访客记录数据
        const exportData = filteredData.map(record => ({
          [t('reports.workerId')]: record.workerId,
          [t('reports.name')]: record.name,
          [t('reports.distributor')]: record.distributorName,
          [t('reports.siteName')]: record.siteName,
          [t('reports.contact')]: record.contact,
          [t('reports.idType')]: record.idType,
          [t('reports.idNumber')]: record.idNumber,
          [t('reports.physicalCardId')]: record.physicalCardId || '-',
          [t('reports.entryDate')]: record.date,
          [t('reports.checkIn')]: record.checkIn || '-',
          [t('reports.exitDate')]: record.checkOutDate || record.date || '-',
          [t('reports.checkOut')]: record.checkOut || '-',
          [t('reports.borrowedItems')]: record.borrowedItems,
          [t('reports.returnedItems')]: record.returnedItems,
          [t('reports.unreturnedItems')]: record.borrowedItems - record.returnedItems,
          [t('reports.registrar')]: record.registrarName || '-'
        }))
        
        const workbook = XLSX.utils.book_new()
        const worksheet = XLSX.utils.json_to_sheet(exportData)
        
        // 设置列宽
        const colWidths = [
          { wch: 15 }, // 工人编号
          { wch: 15 }, // 姓名
          { wch: 20 }, // 分判商
          { wch: 20 }, // 工地名称
          { wch: 15 }, // 联系方式
          { wch: 12 }, // 证件类型
          { wch: 20 }, // 证件号码
          { wch: 15 }, // 实体卡ID
          { wch: 12 }, // 日期
          { wch: 10 }, // 签到时间
          { wch: 10 }, // 签退时间
          { wch: 12 }, // 借用物品
          { wch: 12 }, // 归还物品
          { wch: 12 }, // 未归还物品
          { wch: 15 }  // 登记人
        ]
        worksheet['!cols'] = colWidths
        
        XLSX.utils.book_append_sheet(workbook, worksheet, t('reports.visitorRecords'))
        
        const fileName = `访客记录_${new Date().toISOString().split('T')[0]}.xlsx`
        XLSX.writeFile(workbook, fileName)
        
        message.success(t('reports.downloadVisitorRecords').replace('{count}', filteredData.length.toString()))
      }
    } catch (error) {
      // console.error('导出失败:', error)
      message.error(t('reports.exportFailed'))
    }
  }

  const siteColumns = [
    { title: t('reports.siteName'), dataIndex: 'siteName', key: 'siteName', width: 150, sorter: (a: SiteSummary, b: SiteSummary) => a.siteName.localeCompare(b.siteName) },
    { title: t('reports.totalWorkers'), dataIndex: 'totalWorkers', key: 'totalWorkers', width: 100, sorter: (a: SiteSummary, b: SiteSummary) => a.totalWorkers - b.totalWorkers },
    { title: t('reports.checkedIn'), dataIndex: 'checkedIn', key: 'checkedIn', width: 100, sorter: (a: SiteSummary, b: SiteSummary) => a.checkedIn - b.checkedIn },
    { title: t('reports.checkedOut'), dataIndex: 'checkedOut', key: 'checkedOut', width: 100, sorter: (a: SiteSummary, b: SiteSummary) => a.checkedOut - b.checkedOut },
    { title: t('reports.currentOnSite'), dataIndex: 'currentOnSite', key: 'currentOnSite', width: 100, sorter: (a: SiteSummary, b: SiteSummary) => a.currentOnSite - b.currentOnSite },
    { title: t('reports.onSiteAndLeftRatio'), key: 'onSiteAndLeftRatio', width: 150,
      render: (_: any, record: SiteSummary) => {
        const onSiteRate = record.totalWorkers > 0 ? Math.round((record.currentOnSite / record.totalWorkers) * 100) : 0
        const leftRate = record.totalWorkers > 0 ? Math.round((record.checkedOut / record.totalWorkers) * 100) : 0
        
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#666', minWidth: '40px' }}>{t('reports.onSite')}</span>
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
              <span style={{ fontSize: '12px', color: '#666', minWidth: '40px' }}>{t('reports.left')}</span>
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
    { title: t('reports.date'), dataIndex: 'date', key: 'date', width: 90, fixed: 'left' as const, sorter: (a: AttendanceRecord, b: AttendanceRecord) => a.date.localeCompare(b.date) },
    { title: t('worker.name'), dataIndex: 'name', key: 'name', width: 100, fixed: 'left' as const, sorter: (a: AttendanceRecord, b: AttendanceRecord) => a.name.localeCompare(b.name) },
    { title: t('reports.distributor'), dataIndex: 'distributorName', key: 'distributorName', width: 120, sorter: (a: AttendanceRecord, b: AttendanceRecord) => a.distributorName.localeCompare(b.distributorName) },
    { title: t('reports.contact'), dataIndex: 'contact', key: 'contact', width: 120, sorter: (a: AttendanceRecord, b: AttendanceRecord) => a.contact.localeCompare(b.contact) },
    { title: t('reports.idType'), dataIndex: 'idType', key: 'idType', width: 100, sorter: (a: AttendanceRecord, b: AttendanceRecord) => a.idType.localeCompare(b.idType) },
    { title: t('reports.idNumber'), dataIndex: 'idNumber', key: 'idNumber', width: 160, sorter: (a: AttendanceRecord, b: AttendanceRecord) => a.idNumber.localeCompare(b.idNumber) },
    { title: t('reports.physicalCardId'), dataIndex: 'physicalCardId', key: 'physicalCardId', width: 100, sorter: (a: AttendanceRecord, b: AttendanceRecord) => (a.physicalCardId || '').localeCompare(b.physicalCardId || '') },
    { 
      title: t('reports.registrar'), 
      dataIndex: 'registrarName', 
      key: 'registrarName', 
      width: 100,
      sorter: (a: AttendanceRecord, b: AttendanceRecord) => (a.registrarName || '').localeCompare(b.registrarName || ''),
      render: (name: string) => name || '-'
    },
    { 
      title: t('reports.checkInTime'), 
      key: 'checkIn', 
      width: 120,
      sorter: (a: AttendanceRecord, b: AttendanceRecord) => (a.checkIn || '').localeCompare(b.checkIn || ''),
      render: (_: any, record: AttendanceRecord) => {
        if (!record.checkIn) return '-';
        
        // 如果有完整日期信息，判断是否为今日
        if (record.date) {
          const today = dayjs().format('YYYY-MM-DD');
          // 如果是今天的日期，只显示时间
          if (record.date === today) {
            return record.checkIn; // 只显示时间部分
          }
          // 如果不是今天的日期，显示完整的日期+时间
          return `${record.date} ${record.checkIn}`;
        }
        
        return record.checkIn || '-';
      }
    },
    { 
      title: t('reports.checkOutTime'), 
      key: 'checkOut', 
      width: 120,
      sorter: (a: AttendanceRecord, b: AttendanceRecord) => (a.checkOut || '').localeCompare(b.checkOut || ''),
      render: (_: any, record: AttendanceRecord) => {
        if (!record.checkOut) return '-';
        
        // 使用离场日期而不是入场日期来判断
        const checkOutDate = record.checkOutDate || record.date; // 如果没有单独的离场日期，才使用入场日期
        const today = dayjs().format('YYYY-MM-DD');
        
        // 如果是今天的日期，只显示时间
        if (checkOutDate === today) {
          return record.checkOut; // 只显示时间部分
        }
        // 如果不是今天的日期，显示完整的日期+时间
        return `${checkOutDate} ${record.checkOut}`;
      }
    },
    { 
      title: t('reports.borrowedItems'), 
      key: 'borrowedItems', 
      width: 100,
      sorter: (a: AttendanceRecord, b: AttendanceRecord) => a.borrowedItems - b.borrowedItems,
      render: (_: any, record: AttendanceRecord) => {
        return (
          <Tooltip title={`今日相关 ${record.borrowedItems} 件物品（今日借出+未归还+今日归还）`}>
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
              onClick={() => showTodayRelatedItemDetail(record)}
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
          </Tooltip>
        )
      }
    },
    { 
      title: (
        <span>
          {t('reports.returned')}
          <Tooltip 
            title={
              <div>
                <div>{t('reports.fullyReturned')}</div>
                <div>{t('reports.partiallyReturned')}</div>
                <div>{t('reports.notReturned')}</div>
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
        // 当借用物品数量为0时，无论已归还数量如何都显示绿色（没有需要归还的物品）
        if (record.borrowedItems === 0) {
          // 绿色 - 没有需要归还的物品
          const color = '#52c41a'
          const backgroundColor = '#f6ffed'
          const borderColor = '#b7eb8f'
          return (
            <Tooltip title="无借用物品">
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
                onClick={() => showTodayReturnedItemDetail(record)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#d9f7be'
                  e.currentTarget.style.borderColor = '#95de64'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = backgroundColor
                  e.currentTarget.style.borderColor = borderColor
                }}
              >
                {record.returnedItems}
              </span>
            </Tooltip>
          )
        }
        
        // 有借用物品时的原有逻辑
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
          <Tooltip title={`今日归还 ${record.returnedItems} 件物品`}>
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
              onClick={() => showTodayReturnedItemDetail(record)}
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
          </Tooltip>
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
              title={`${t('reports.dailyEnteredCount')}`}
              // title={`${t('reports.dailyEnteredCount')}（${selectedDateStr}）`}
              value={totalEntered}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title={`${t('reports.leftCount')}`}
              // title={`${t('reports.leftCount')}（${selectedDateStr}）`}
              value={leftCount}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#52c41a', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title={t('reports.pendingCount')}
              value={pending.length}
              prefix={<TeamOutlined />}
              valueStyle={{ color: pending.length > 0 ? '#fa541c' : '#52c41a', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title={t('reports.borrowedItemsCount')}
              value={totalBorrowedItems}
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: '#1890ff', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title={t('reports.returnedItemsCount')}
              value={totalReturnedItems}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title={t('reports.unreturnedItemsCount')}
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
            <div style={{ marginBottom: 4 }}>{t('reports.dateSelection')}</div>
            {dateType === 'single' ? (
              <DatePicker 
                value={singleDate} 
                onChange={(d) => d && setSingleDate(d)} 
                style={{ width: '100%' }} 
                placeholder={t('reports.selectDate')}
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
                      modeSwitch.textContent = t('reports.switchToRange');
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
                      {t('reports.thisWeek')}
                    </Button>
                    <Button 
                      size="small" 
                      onClick={() => setDateRange([dayjs().startOf('month'), dayjs().endOf('month')])}
                    >
                      {t('reports.thisMonth')}
                    </Button>
                    <Button 
                      size="small" 
                      onClick={() => setDateRange([dayjs().subtract(7, 'day'), dayjs()])}
                    >
                      {t('reports.last7Days')}
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
                  placeholder={[t('reports.startDate'), t('reports.endDate')]}
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
                        modeSwitch.textContent = t('reports.switchToSingle');
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
            <div style={{ marginBottom: 4 }}>{t('reports.searchWorkers')}</div>
            <Input.Search
              placeholder={t('reports.searchPlaceholder')}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onSearch={setSearchKeyword}
              allowClear
              enterButton={<SearchOutlined />}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 4 }}>{t('reports.selectDistributors')}</div>
            <Select
              mode="multiple"
              placeholder={t('reports.allDistributors')}
              value={selectedDistributors}
              onChange={setSelectedDistributors}
              style={{ width: '100%' }}
              options={distributors.map(dist => ({ label: dist.name, value: dist.id }))}
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
                {t('reports.searchResults').replace('{count}', filteredData.length.toString())}
                {searchKeyword.trim() && (
                  <Button 
                    type="link" 
                    size="small" 
                    onClick={clearSearch}
                    style={{ marginLeft: 8, padding: 0, height: 'auto' }}
                  >
                    {t('reports.clearSearch')}
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
          <Space>
            <Button 
              type="default" 
              icon={<ReloadOutlined />} 
              onClick={() => loadData()}
            >
              {t('common.refresh')}
            </Button>
            <Button 
              type="primary" 
              icon={<DownloadOutlined />} 
              onClick={() => setDownloadModalVisible(true)}
            >
              {t('reports.downloadExcel')}
            </Button>
          </Space>
        }
        items={[
          {
            key: 'visitor-records',
            label: t('reports.visitorRecords'),
            children: (
              <div style={{ height: tableHeight, display: 'flex', flexDirection: 'column' }}>
                <Spin spinning={loading}>
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
                      showTotal: (total, range) => t('reports.paginationInfo').replace('{start}', range[0].toString()).replace('{end}', range[1].toString()).replace('{total}', total.toString()),
                      pageSizeOptions: ['10', '20', '50', '100'],
                      onChange: handlePageChange,
                      onShowSizeChange: handlePageSizeChange
                    }}
                  />
                </Spin>
              </div>
            )
          },
          {
            key: 'site-summary',
            label: t('reports.siteVisitorStats'),
            children: (
              <div style={{ height: tableHeight, display: 'flex', flexDirection: 'column' }}>
                <Spin spinning={loading}>
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
                      showTotal: (total, range) => t('reports.paginationInfo').replace('{start}', range[0].toString()).replace('{end}', range[1].toString()).replace('{total}', total.toString()),
                      pageSizeOptions: ['5', '10', '20'],
                      size: 'small'
                    }}
                  />
                </Spin>
              </div>
            )
          }
        ]}
      />

      {/* 物品详情弹窗 */}
      <Modal
        title={`${selectedRecord?.name} - ${
          itemDetailModalType === 'todayRelated' 
            ? t('reports.todayRelatedItemsRecord')
            : t('reports.todayReturnedItemsRecord')
        }`}
        open={itemDetailModalVisible}
        onCancel={() => setItemDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setItemDetailModalVisible(false)}>
            {t('reports.close')}
          </Button>
        ]}
        width={600}
      >
        {selectedRecord && (
          <div>
            <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <strong>{t('reports.workerName')}：</strong>{selectedRecord.name}
                </Col>
                <Col span={12}>
                  <strong>{t('reports.distributor')}：</strong>{selectedRecord.distributorName}
                </Col>
                <Col span={12} style={{ marginTop: 8 }}>
                  <strong>{t('reports.checkInTime')}：</strong>
                  {selectedRecord.checkIn ? 
                    (selectedRecord.date === dayjs().format('YYYY-MM-DD') 
                      ? selectedRecord.checkIn 
                      : `${selectedRecord.date} ${selectedRecord.checkIn}`) 
                    : '-'}
                </Col>
                <Col span={12} style={{ marginTop: 8 }}>
                  <strong>{t('reports.checkOutTime')}：</strong>
                  {selectedRecord.checkOut ? 
                    ((selectedRecord.checkOutDate || selectedRecord.date) === dayjs().format('YYYY-MM-DD') 
                      ? selectedRecord.checkOut 
                      : `${selectedRecord.checkOutDate || selectedRecord.date} ${selectedRecord.checkOut}`) 
                    : '-'}
                </Col>
              </Row>
            </div>
            
            <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '0 4px' }}>
              <List
                dataSource={generateItemData(selectedRecord)}
                renderItem={(item: any) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>{item.name}</span>
                          <Tag color={item.status === 'returned' ? 'green' : 'orange'}>
                            {item.status === 'returned' ? t('reports.returnedStatus') : t('reports.notReturnedStatus')}
                          </Tag>
                        </div>
                      }
                      description={
                        <div>
                          <div><strong>{t('reports.itemCategory')}：</strong>{item.category}</div>
                          <div><strong>{t('reports.handler')}：</strong>{item.borrowHandler}</div>
                          <div><strong>{t('reports.borrowTime')}：</strong>{item.borrowedTime}</div>
                          <div><strong>{t('reports.returnTime')}：</strong>{item.returnedTime || '-'}</div>
                          {item.notes && (
                            <div style={{ marginTop: 4 }}>
                              <strong>{t('reports.notes') || '备注'}：</strong>
                              <div style={{ 
                                backgroundColor: '#fffbe6', 
                                padding: '4px 8px', 
                                borderRadius: 4,
                                borderLeft: '3px solid #faad14',
                                marginTop: 2,
                                wordBreak: 'break-word'
                              }}>
                                {item.notes}
                              </div>
                            </div>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* 下载选项模态框 */}
      <Modal
        title={t('reports.downloadOptionsTitle')}
        open={downloadModalVisible}
        onCancel={() => setDownloadModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setDownloadModalVisible(false)}>
            {t('common.cancel')}
          </Button>,
          <Button 
            key="downloadVisitorRecords" 
            type="primary" 
            onClick={() => {
              setDownloadModalVisible(false)
              setActiveTab('visitor-records')
              setTimeout(() => downloadExcel(), 100)
            }}
          >
            {t('reports.downloadVisitorRecordsTab')}
          </Button>,
          <Button 
            key="downloadSiteSummary" 
            type="primary" 
            onClick={() => {
              setDownloadModalVisible(false)
              setActiveTab('site-summary')
              setTimeout(() => downloadExcel(), 100)
            }}
          >
            {t('reports.downloadSiteSummaryTab')}
          </Button>
        ]}
        width={600}
      >
        <div style={{ marginTop: 16 }}>
          <p style={{ marginBottom: 16, color: '#666' }}>
            {t('reports.downloadOptionsDescription')}
          </p>
          
          <div style={{ 
            background: '#f5f5f5', 
            padding: '12px 16px', 
            borderRadius: '6px', 
            marginBottom: 16 
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
              {t('reports.downloadVisitorRecordsTab')}
            </div>
            <div style={{ color: '#666', fontSize: '14px', marginBottom: 8 }}>
              {t('reports.downloadVisitorRecordsDescription').replace('{count}', filteredData.length.toString())}
            </div>
            <div style={{ fontSize: '12px', color: '#999' }}>
              {t('reports.downloadVisitorRecordsFields')}
            </div>
          </div>
          
          <div style={{ 
            background: '#e6f7ff', 
            padding: '12px 16px', 
            borderRadius: '6px', 
            border: '1px solid #91d5ff' 
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: 8, color: '#1890ff' }}>
              {t('reports.downloadSiteSummaryTab')}
            </div>
            <div style={{ color: '#666', fontSize: '14px', marginBottom: 8 }}>
              {t('reports.downloadSiteSummaryDescription').replace('{count}', filteredSiteSummaries.length.toString())}
            </div>
            <div style={{ fontSize: '12px', color: '#999' }}>
              {t('reports.downloadSiteSummaryFields')}
            </div>
          </div>
          
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
              💡 {t('reports.downloadTips')}:
            </div>
            <div>• {t('reports.downloadTip1')}</div>
            <div>• {t('reports.downloadTip2')}</div>
            <div>• {t('reports.downloadTip3')}</div>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default Reports
