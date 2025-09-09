import React, { useState, useEffect } from 'react'
import { 
  Card, 
  Button, 
  Input, 
  Select, 
  Modal, 
  Table, 
  message, 
  Space, 
  Typography, 
  Row, 
  Col, 
  Statistic,
  Tag,
  Form,
  InputNumber,
  Divider,
  Layout,
  Avatar,
  Dropdown,
  Checkbox,
  Tooltip
} from 'antd'
import { 
  UserAddOutlined, 
  ShoppingCartOutlined, 
  LogoutOutlined, 
  BarChartOutlined,
  QrcodeOutlined,
  PhoneOutlined,
  IdcardOutlined,
  UserOutlined,
  ClockCircleOutlined,
  ArrowLeftOutlined,
  QuestionCircleOutlined,
  GlobalOutlined
} from '@ant-design/icons'
import { mockWorkers, mockSites, mockDistributors } from '../data/mockData'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { useLocale } from '../contexts/LocaleContext'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Option } = Select
const { Header } = Layout

interface Worker {
  id: string
  name: string
  workerId: string
  idCard: string
  phone: string
  distributorId: string
  siteId: string
  physicalCardId?: string
  entryTime?: string
  exitTime?: string
  status: 'in' | 'out'
  borrowedItems?: Array<{
    itemType: string
    itemId: string
    borrowTime: string
    returnTime?: string
    remark?: string
  }>
}

interface AttendanceRecord {
  id: string
  workerId: string
  workerName: string
  entryTime: string
  exitTime?: string
  physicalCardId: string
  phone: string
  idCard?: string
  status: 'in' | 'out'
  borrowedItems: number
  returnedItems: number
}

const Guard: React.FC = () => {
  // 认证和导航
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { locale, setLocale, t } = useLocale()
  
  // 状态管理
  const [currentView, setCurrentView] = useState<'main' | 'entry' | 'borrow' | 'exit' | 'reports' | 'userCenter'>('main')
  const [currentTime, setCurrentTime] = useState(dayjs().format('YYYY-MM-DD HH:mm:ss'))
  const [scannedWorkerId, setScannedWorkerId] = useState('')
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null)
  const [physicalCardId, setPhysicalCardId] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [borrowModalVisible, setBorrowModalVisible] = useState(false)
  const [exitModalVisible, setExitModalVisible] = useState(false)
  const [selectedItemType, setSelectedItemType] = useState('')
  const [itemId, setItemId] = useState('')
  const [itemNumber, setItemNumber] = useState('')
  const [borrowRemark, setBorrowRemark] = useState('')
  const [borrowItemsList, setBorrowItemsList] = useState<Array<{
    itemType: string
    itemId: string
    remark: string
    showRemark?: boolean
  }>>([])
  const [selectedReturnItems, setSelectedReturnItems] = useState<string[]>([])
  const [currentBorrowedItems, setCurrentBorrowedItems] = useState<Array<{
    itemType: string
    itemId: string
    borrowTime: string
    remark: string
  }>>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [selectedBorrowedItems, setSelectedBorrowedItems] = useState<string[]>([])
  const [unreturnedItemRemarks, setUnreturnedItemRemarks] = useState<{[key: string]: string}>({})
  const [physicalCardReturned, setPhysicalCardReturned] = useState(false)
  const [borrowQueryId, setBorrowQueryId] = useState('')
  const [userCenterModalVisible, setUserCenterModalVisible] = useState(false)
  const [passwordForm] = Form.useForm()
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  })
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [jumpPage, setJumpPage] = useState<string>('')
  const [itemRecordsModalVisible, setItemRecordsModalVisible] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null)

  // 计算统计数据
  const currentOnSite = workers.filter(w => w.status === 'in').length
  const totalExitedToday = workers.filter(w => w.status === 'out').length
  const totalEnteredToday = attendanceRecords.filter(r => 
    dayjs(r.entryTime).isSame(dayjs(), 'day')
  ).length
  const totalBorrowedItems = workers.reduce((total, worker) => {
    return total + (worker.borrowedItems?.length || 0)
  }, 0)
  const totalUnreturnedItems = workers.reduce((total, worker) => {
    const unreturnedItems = worker.borrowedItems?.filter(item => !item.returnTime) || []
    return total + unreturnedItems.length
  }, 0)

  // 实时时间更新
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs().format('YYYY-MM-DD HH:mm:ss'))
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // 初始化数据
  useEffect(() => {
    // 模拟从API获取工人数据
    const workerData: Worker[] = mockWorkers.map(worker => ({
      ...worker,
      status: 'out' as const,
      borrowedItems: []
    }))
    setWorkers(workerData)
    
    // 模拟从API获取考勤记录
    const mockRecords: AttendanceRecord[] = [
      {
        id: '1',
        workerId: 'WK001',
        workerName: '张三',
        idCard: '110101199001011234',
        entryTime: dayjs().subtract(2, 'hour').format('YYYY-MM-DD HH:mm:ss'),
        physicalCardId: 'CARD001',
        phone: '13800138001',
        status: 'in',
        borrowedItems: 2,
        returnedItems: 1
      },
      {
        id: '2',
        workerId: 'WK002',
        workerName: '李四',
        idCard: '110101199002021234',
        entryTime: dayjs().subtract(1, 'hour').format('YYYY-MM-DD HH:mm:ss'),
        physicalCardId: 'CARD002',
        phone: '13800138002',
        status: 'in',
        borrowedItems: 1,
        returnedItems: 1
      },
      {
        id: '3',
        workerId: 'WK003',
        workerName: '王五',
        idCard: '110101199003031234',
        entryTime: dayjs().subtract(3, 'hour').format('YYYY-MM-DD HH:mm:ss'),
        exitTime: dayjs().subtract(1, 'hour').format('YYYY-MM-DD HH:mm:ss'),
        physicalCardId: 'CARD003',
        phone: '13800138003',
        status: 'out',
        borrowedItems: 0,
        returnedItems: 0
      },
      {
        id: '4',
        workerId: 'WK004',
        workerName: '赵六',
        idCard: '110101199004041234',
        entryTime: dayjs().subtract(4, 'hour').format('YYYY-MM-DD HH:mm:ss'),
        physicalCardId: 'CARD004',
        phone: '13800138004',
        status: 'in',
        borrowedItems: 3,
        returnedItems: 2
      },
      {
        id: '5',
        workerId: 'WK005',
        workerName: '钱七',
        idCard: '110101199005051234',
        entryTime: dayjs().subtract(30, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        physicalCardId: 'CARD005',
        phone: '13800138005',
        status: 'in',
        borrowedItems: 1,
        returnedItems: 0
      },
      {
        id: '6',
        workerId: 'WK006',
        workerName: '孙八',
        idCard: '110101199006061234',
        entryTime: dayjs().subtract(5, 'hour').format('YYYY-MM-DD HH:mm:ss'),
        exitTime: dayjs().subtract(2, 'hour').format('YYYY-MM-DD HH:mm:ss'),
        physicalCardId: 'CARD006',
        phone: '13800138006',
        status: 'out',
        borrowedItems: 1,
        returnedItems: 1
      },
      {
        id: '7',
        workerId: 'WK007',
        workerName: '周九',
        idCard: '110101199007071234',
        entryTime: dayjs().subtract(90, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        physicalCardId: 'CARD007',
        phone: '13800138007',
        status: 'in',
        borrowedItems: 2,
        returnedItems: 1
      },
      {
        id: '8',
        workerId: 'WK008',
        workerName: '吴十',
        idCard: '110101199008081234',
        entryTime: dayjs().subtract(6, 'hour').format('YYYY-MM-DD HH:mm:ss'),
        exitTime: dayjs().subtract(3, 'hour').format('YYYY-MM-DD HH:mm:ss'),
        physicalCardId: 'CARD008',
        phone: '13800138008',
        status: 'out',
        borrowedItems: 0,
        returnedItems: 0
      },
      {
        id: '9',
        workerId: 'WK009',
        workerName: '郑十一',
        idCard: '110101199009091234',
        entryTime: dayjs().subtract(45, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        physicalCardId: 'CARD009',
        phone: '13800138009',
        status: 'in',
        borrowedItems: 1,
        returnedItems: 1
      },
      {
        id: '10',
        workerId: 'WK010',
        workerName: '王十二',
        idCard: '110101199010101234',
        entryTime: dayjs().subtract(135, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        physicalCardId: 'CARD010',
        phone: '13800138010',
        status: 'in',
        borrowedItems: 0,
        returnedItems: 0
      },
      {
        id: '11',
        workerId: 'WK011',
        workerName: '李十三',
        entryTime: dayjs().subtract(7, 'hour').format('YYYY-MM-DD HH:mm:ss'),
        exitTime: dayjs().subtract(4, 'hour').format('YYYY-MM-DD HH:mm:ss'),
        physicalCardId: 'CARD011',
        phone: '13800138011',
        idCard: '110101199011111234',
        status: 'out',
        borrowedItems: 2,
        returnedItems: 2
      },
      {
        id: '12',
        workerId: 'WK012',
        workerName: '张十四',
        entryTime: dayjs().subtract(105, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        physicalCardId: 'CARD012',
        phone: '13800138012',
        idCard: '110101199012121234',
        status: 'in',
        borrowedItems: 1,
        returnedItems: 0
      },
      {
        id: '13',
        workerId: 'WK013',
        workerName: '刘十五',
        entryTime: dayjs().subtract(210, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        exitTime: dayjs().subtract(75, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        physicalCardId: 'CARD013',
        phone: '13800138013',
        status: 'out',
        borrowedItems: 0,
        returnedItems: 0
      },
      {
        id: '14',
        workerId: 'WK014',
        workerName: '陈十六',
        entryTime: dayjs().subtract(20, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        physicalCardId: 'CARD014',
        phone: '13800138014',
        status: 'in',
        borrowedItems: 2,
        returnedItems: 1
      },
      {
        id: '15',
        workerId: 'WK015',
        workerName: '杨十七',
        entryTime: dayjs().subtract(8, 'hour').format('YYYY-MM-DD HH:mm:ss'),
        exitTime: dayjs().subtract(5, 'hour').format('YYYY-MM-DD HH:mm:ss'),
        physicalCardId: 'CARD015',
        phone: '13800138015',
        status: 'out',
        borrowedItems: 1,
        returnedItems: 1
      },
      {
        id: '16',
        workerId: 'WK016',
        workerName: '黄十八',
        entryTime: dayjs().subtract(10, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        physicalCardId: 'CARD016',
        phone: '13800138016',
        status: 'in',
        borrowedItems: 0,
        returnedItems: 0
      },
      {
        id: '17',
        workerId: 'WK017',
        workerName: '林十九',
        entryTime: dayjs().subtract(80, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        exitTime: dayjs().subtract(30, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        physicalCardId: 'CARD017',
        phone: '13800138017',
        status: 'out',
        borrowedItems: 2,
        returnedItems: 2
      },
      {
        id: '18',
        workerId: 'WK018',
        workerName: '何二十',
        entryTime: dayjs().subtract(165, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        physicalCardId: 'CARD018',
        phone: '13800138018',
        status: 'in',
        borrowedItems: 1,
        returnedItems: 0
      },
      {
        id: '19',
        workerId: 'WK019',
        workerName: '郭二一',
        entryTime: dayjs().subtract(255, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        exitTime: dayjs().subtract(150, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        physicalCardId: 'CARD019',
        phone: '13800138019',
        status: 'out',
        borrowedItems: 0,
        returnedItems: 0
      },
      {
        id: '20',
        workerId: 'WK020',
        workerName: '马二二',
        entryTime: dayjs().subtract(35, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        physicalCardId: 'CARD020',
        phone: '13800138020',
        status: 'in',
        borrowedItems: 3,
        returnedItems: 1
      },
      {
        id: '21',
        workerId: 'WK021',
        workerName: '罗二三',
        entryTime: dayjs().subtract(330, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        exitTime: dayjs().subtract(225, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        physicalCardId: 'CARD021',
        phone: '13800138021',
        status: 'out',
        borrowedItems: 1,
        returnedItems: 1
      },
      {
        id: '22',
        workerId: 'WK022',
        workerName: '高二四',
        entryTime: dayjs().subtract(70, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        physicalCardId: 'CARD022',
        phone: '13800138022',
        status: 'in',
        borrowedItems: 2,
        returnedItems: 1
      },
      {
        id: '23',
        workerId: 'WK023',
        workerName: '梁二五',
        entryTime: dayjs().subtract(380, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        exitTime: dayjs().subtract(250, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        physicalCardId: 'CARD023',
        phone: '13800138023',
        status: 'out',
        borrowedItems: 0,
        returnedItems: 0
      },
      {
        id: '24',
        workerId: 'WK024',
        workerName: '宋二六',
        entryTime: dayjs().subtract(25, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        physicalCardId: 'CARD024',
        phone: '13800138024',
        status: 'in',
        borrowedItems: 1,
        returnedItems: 1
      },
      {
        id: '25',
        workerId: 'WK025',
        workerName: '唐二七',
        entryTime: dayjs().subtract(190, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        exitTime: dayjs().subtract(90, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        physicalCardId: 'CARD025',
        phone: '13800138025',
        status: 'out',
        borrowedItems: 2,
        returnedItems: 2
      }
    ]
    setAttendanceRecords(mockRecords)
  }, [])

  // 1. 入场登记功能
  const handleEntryRegistration = () => {
    setCurrentView('entry')
    setScannedWorkerId('')
    setSelectedWorker(null)
    setPhysicalCardId('')
    setPhoneNumber('')
  }

  const handleScanWorkerId = () => {
    if (!scannedWorkerId.trim()) {
      message.error('请输入工人ID')
      return
    }

    const worker = workers.find(w => w.workerId === scannedWorkerId.trim())
    if (!worker) {
      message.error('未找到该工人信息')
      return
    }

    if (worker.status === 'in') {
      message.error('该工人已入场，请检查状态')
      return
    }

    setSelectedWorker(worker)
    setPhoneNumber(worker.phone)
    message.success('工人信息查询成功')
  }

  const handleCompleteEntry = () => {
    if (!selectedWorker) {
      message.error('请先查询工人信息')
      return
    }

    if (!physicalCardId.trim()) {
      message.error('请输入实体卡编号')
      return
    }

    if (!phoneNumber.trim()) {
      message.error('请输入联系电话')
      return
    }

    // 更新工人状态
    const updatedWorkers = workers.map(w => 
      w.id === selectedWorker.id 
        ? { 
            ...w, 
            status: 'in' as const,
            physicalCardId: physicalCardId.trim(),
            entryTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
            phone: phoneNumber.trim()
          }
        : w
    )
    setWorkers(updatedWorkers)

    // 添加考勤记录
    const newRecord: AttendanceRecord = {
      id: Date.now().toString(),
      workerId: selectedWorker.workerId,
      workerName: selectedWorker.name,
      entryTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      physicalCardId: physicalCardId.trim(),
      phone: phoneNumber.trim(),
      status: 'in',
      borrowedItems: 0,
      returnedItems: 0
    }
    setAttendanceRecords(prev => [newRecord, ...prev])

    message.success(t('guard.entryCompleted'))
    
    // 清空输入和查询信息，停留在当前页面
    setScannedWorkerId('')
    setSelectedWorker(null)
    setPhysicalCardId('')
    setPhoneNumber('')
  }

  // 2. 借/还物品功能
  const handleItemBorrowing = () => {
    setCurrentView('borrow')
    setScannedWorkerId('')
    setSelectedWorker(null)
  }

  const handleScanForBorrow = () => {
    if (!scannedWorkerId.trim()) {
      message.error('请输入二维码编号或实体卡编号')
      return
    }

    const worker = workers.find(w => 
      w.workerId === scannedWorkerId.trim() || w.physicalCardId === scannedWorkerId.trim()
    )
    
    if (!worker) {
      message.error('未找到对应的工人信息')
      return
    }

    if (worker.status === 'out') {
      message.error('该工人未在场内，无法借物')
      return
    }

    setSelectedWorker(worker)
    
    // 加载当前借用物品列表
    const borrowedItems = worker.borrowedItems?.filter(item => !item.returnTime).map(item => ({
      itemType: item.itemType,
      itemId: item.itemId,
      borrowTime: item.borrowTime,
      remark: item.remark || ''
    })) || []
    setCurrentBorrowedItems(borrowedItems)
    setSelectedReturnItems([])
    
    message.success('工人信息查询成功')
  }

  const handleAddItemToList = () => {
    if (!selectedItemType) {
      message.error('请选择物品类型')
      return
    }

    if (!itemNumber.trim()) {
      message.error('请输入物品编号')
      return
    }

    // 检查是否已存在相同的物品
    const existingItem = borrowItemsList.find(item => 
      item.itemType === selectedItemType && item.itemId === itemNumber.trim()
    )

    if (existingItem) {
      message.error('该物品已添加到借用列表中')
      return
    }

    const newItem = {
      itemType: selectedItemType,
      itemId: itemNumber.trim(),
      remark: '',
      showRemark: false
    }

    setBorrowItemsList([...borrowItemsList, newItem])
    
    // 清空输入框
    setSelectedItemType('')
    setItemNumber('')
    
    message.success('物品已添加到借用列表')
  }

  const handleRemoveItemFromList = (index: number) => {
    const newList = borrowItemsList.filter((_, i) => i !== index)
    setBorrowItemsList(newList)
    message.success('物品已从借用列表中移除')
  }

  const handleBorrowReturnItems = () => {
    if (selectedReturnItems.length === 0) {
      message.error('请选择要归还的物品')
      return
    }

    const updatedWorkers = workers.map(w => 
      w.id === selectedWorker?.id 
        ? { 
            ...w, 
            borrowedItems: w.borrowedItems?.map(item => 
              selectedReturnItems.includes(`${item.itemType}-${item.itemId}`)
                ? { ...item, returnTime: dayjs().format('YYYY-MM-DD HH:mm:ss') }
                : item
            )
          }
        : w
    )
    setWorkers(updatedWorkers)

    // 更新考勤记录
    const updatedRecords = attendanceRecords.map(record => 
      record.workerId === selectedWorker?.workerId
        ? { ...record, borrowedItems: Math.max(0, record.borrowedItems - selectedReturnItems.length) }
        : record
    )
    setAttendanceRecords(updatedRecords)

    message.success(`成功归还 ${selectedReturnItems.length} 个物品`)
    
    // 重新加载当前借用物品列表
    const updatedWorker = updatedWorkers.find(w => w.id === selectedWorker?.id)
    if (updatedWorker) {
      const borrowedItems = updatedWorker.borrowedItems?.filter(item => !item.returnTime).map(item => ({
        itemType: item.itemType,
        itemId: item.itemId,
        borrowTime: item.borrowTime,
        remark: item.remark || ''
      })) || []
      setCurrentBorrowedItems(borrowedItems)
    }
    
    setSelectedReturnItems([])
  }

  const handleCompleteBorrow = () => {
    if (!selectedWorker) {
      message.error('请先查询工人信息')
      return
    }

    if (borrowItemsList.length === 0) {
      message.error('请至少添加一个物品到借用列表')
      return
    }

    // 将借用列表中的物品转换为完整的借用记录
    const borrowedItems = borrowItemsList.map(item => ({
      itemType: item.itemType,
      itemId: item.itemId,
      borrowTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      remark: item.remark
    }))

    const updatedWorkers = workers.map(w => 
      w.id === selectedWorker.id 
        ? { 
            ...w, 
            borrowedItems: [...(w.borrowedItems || []), ...borrowedItems]
          }
        : w
    )
    setWorkers(updatedWorkers)

    // 更新考勤记录
    const updatedRecords = attendanceRecords.map(record => 
      record.workerId === selectedWorker.workerId
        ? { ...record, borrowedItems: record.borrowedItems + borrowItemsList.length }
        : record
    )
    setAttendanceRecords(updatedRecords)

    message.success(`借物登记完成，共借用 ${borrowItemsList.length} 个物品`)
    
    // 清空输入和查询信息，停留在当前页面
    setScannedWorkerId('')
    setSelectedWorker(null)
    setSelectedItemType('')
    setItemNumber('')
    setBorrowItemsList([])
    setCurrentBorrowedItems([])
    setSelectedReturnItems([])
  }

  // 3. 离场功能
  const handleExitProcess = () => {
    setCurrentView('exit')
    setScannedWorkerId('')
    setSelectedWorker(null)
  }

  const handleScanForExit = () => {
    if (!scannedWorkerId.trim()) {
      message.error('请输入二维码编号或实体卡编号')
      return
    }

    const worker = workers.find(w => 
      w.workerId === scannedWorkerId.trim() || w.physicalCardId === scannedWorkerId.trim()
    )
    
    if (!worker) {
      message.error('未找到对应的工人信息')
      return
    }

    if (worker.status === 'out') {
      message.error('该工人未在场内，无法离场')
      return
    }

    setSelectedWorker(worker)
    message.success('工人信息查询成功')
  }

  const handleCompleteExit = () => {
    if (!selectedWorker) return

    // 验证实体卡是否已归还
    if (!physicalCardReturned) {
      message.error('请确认实体卡已归还')
      return
    }

    // 验证未归还物品是否都有备注
    const unreturnedItems = selectedWorker.borrowedItems?.filter((item: any) => !item.returnTime) || []
    for (const item of unreturnedItems) {
      if (!unreturnedItemRemarks[item.itemId] || unreturnedItemRemarks[item.itemId].trim() === '') {
        message.error(`请为未归还物品 "${item.itemType} - ${item.itemId}" 填写备注`)
        return
      }
    }

    // 更新工人状态
    const updatedWorkers = workers.map(w => 
      w.id === selectedWorker.id 
        ? { 
            ...w, 
            status: 'out' as const,
            exitTime: dayjs().format('YYYY-MM-DD HH:mm:ss')
          }
        : w
    )
    setWorkers(updatedWorkers)

    // 更新考勤记录
    const updatedRecords = attendanceRecords.map(record => 
      record.workerId === selectedWorker.workerId
        ? { 
            ...record, 
            status: 'out' as const,
            exitTime: dayjs().format('YYYY-MM-DD HH:mm:ss')
          }
        : record
    )
    setAttendanceRecords(updatedRecords)

    message.success(t('guard.exitCompleted'))
    
    // 清空输入和查询信息，停留在当前页面
    setScannedWorkerId('')
    setSelectedWorker(null)
    setSelectedBorrowedItems([])
    setUnreturnedItemRemarks({})
    setPhysicalCardReturned(false)
  }

  // 4. 报表功能
  const handleReports = () => {
    setCurrentView('reports')
  }

  // 处理统计卡片点击事件
  const handleStatClick = (filterType: 'all' | 'in' | 'out') => {
    setStatusFilter(filterType)
    setCurrentView('reports')
  }

  // 返回主页面
  const handleBackToMain = () => {
    setCurrentView('main')
  }

  // 登出功能
  const handleLogout = () => {
    logout()
    navigate('/login')
    message.success(t('login.logoutSuccess'))
  }

  // 用户中心相关处理函数
  const handleUserCenterClick = () => {
    setUserCenterModalVisible(true)
  }

  // 语言切换处理函数
  const handleLanguageChange = (newLocale: string) => {
    setLocale(newLocale as 'zh-CN' | 'zh-TW' | 'en-US')
    message.success(t('login.languageChanged'))
  }

  const handlePasswordChange = async (values: { oldPassword: string; newPassword: string; confirmPassword: string }) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('新密码和确认密码不一致')
      return
    }
    
    // 模拟密码修改
    message.success('密码修改成功')
    setUserCenterModalVisible(false)
    passwordForm.resetFields()
  }

  // 分页处理函数
  const handleTableChange = (page: number, pageSize?: number) => {
    setPagination(prev => ({
      current: page,
      pageSize: pageSize || prev.pageSize,
      total: prev.total
    }))
  }

  // 状态筛选处理函数
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    setPagination(prev => ({ ...prev, current: 1 })) // 重置到第一页
  }

  // 页数跳转处理函数
  const handleJumpToPage = (totalRecords: number) => {
    const pageNumber = parseInt(jumpPage)
    const totalPages = Math.ceil(totalRecords / pagination.pageSize)
    
    if (isNaN(pageNumber) || pageNumber < 1 || pageNumber > totalPages) {
      message.error(`请输入1到${totalPages}之间的页码`)
      return
    }
    
    setPagination(prev => ({ ...prev, current: pageNumber }))
    setJumpPage('')
  }

  // 查看物品借用记录
  const handleViewItemRecords = (record: AttendanceRecord) => {
    setSelectedRecord(record)
    setItemRecordsModalVisible(true)
  }

  // 归还选中物品
  const handleReturnItems = () => {
    if (!selectedWorker || selectedBorrowedItems.length === 0) {
      message.error('请选择要归还的物品')
      return
    }

    const updatedWorkers = workers.map(w => 
      w.id === selectedWorker.id 
        ? { 
            ...w, 
            borrowedItems: w.borrowedItems?.map(item => 
              selectedBorrowedItems.includes(item.itemId)
                ? { ...item, returnTime: dayjs().format('YYYY-MM-DD HH:mm:ss') }
                : item
            )
          }
        : w
    )
    setWorkers(updatedWorkers)

    // 更新考勤记录
    const updatedRecords = attendanceRecords.map(record => 
      record.workerId === selectedWorker.workerId
        ? { ...record, returnedItems: record.returnedItems + selectedBorrowedItems.length }
        : record
    )
    setAttendanceRecords(updatedRecords)

    message.success(`成功归还 ${selectedBorrowedItems.length} 件物品`)
    setSelectedBorrowedItems([])
  }

  // 检查是否可以完成离场
  const canCompleteExit = () => {
    if (!selectedWorker) return false
    
    // 检查实体卡是否已归还
    if (!physicalCardReturned) return false
    
    // 检查未归还物品是否都有备注
    const unreturnedItems = selectedWorker.borrowedItems?.filter((item: any) => !item.returnTime) || []
    for (const item of unreturnedItems) {
      if (!unreturnedItemRemarks[item.itemId] || unreturnedItemRemarks[item.itemId].trim() === '') {
        return false
      }
    }
    
    return true
  }

  // 借/还物品页面查询工人信息
  const handleBorrowQuery = () => {
    if (!borrowQueryId.trim()) {
      message.error('请输入二维码编号或实体卡编号')
      return
    }

    const worker = workers.find(w => 
      w.workerId === borrowQueryId || w.physicalCardId === borrowQueryId
    )

    if (!worker) {
      message.error('未找到对应的工人信息')
      return
    }

    if (worker.status !== 'in') {
      message.error('该工人未在场内，无法借物')
      return
    }

    setSelectedWorker(worker)
    message.success('工人信息查询成功')
  }


  // Header组件
  const renderHeader = () => (
    <Header style={{ 
      background: '#fff', 
      padding: '0 clamp(12px, 3vw, 24px)', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
      borderBottom: '1px solid #f0f0f0',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      height: '64px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px, 3vw, 24px)' }}>
        <Title level={2} style={{ 
          margin: 0, 
          color: '#1890ff', 
          fontSize: 'clamp(16px, 4vw, 24px)',
          lineHeight: '1.2'
        }}>
          {user?.siteName || '工地管理系统'}
        </Title>
        <Text type="secondary" style={{ 
          fontSize: 'clamp(12px, 3vw, 18px)', 
          fontWeight: 'bold',
          whiteSpace: 'nowrap'
        }}>
          <ClockCircleOutlined /> {currentTime}
        </Text>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 2vw, 16px)' }}>
        <Dropdown
          menu={{
            items: [
              {
                key: 'userCenter',
                label: t('navigation.changePassword'),
                icon: <UserOutlined />,
                onClick: handleUserCenterClick
              },
              {
                key: 'language',
                label: t('navigation.languageSwitch'),
                icon: <GlobalOutlined />,
                children: [
                  {
                    key: 'zh-CN',
                    label: t('languages.zhCN'),
                    onClick: () => handleLanguageChange('zh-CN')
                  },
                  {
                    key: 'zh-TW',
                    label: t('languages.zhTW'),
                    onClick: () => handleLanguageChange('zh-TW')
                  },
                  {
                    key: 'en-US',
                    label: t('languages.enUS'),
                    onClick: () => handleLanguageChange('en-US')
                  }
                ]
              },
              {
                key: 'logout',
                label: t('navigation.logout'),
                icon: <LogoutOutlined />,
                onClick: handleLogout
              }
            ]
          }}
          placement="bottomRight"
        >
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'clamp(6px, 1.5vw, 12px)',
            cursor: 'pointer',
            padding: 'clamp(4px, 1vw, 8px) clamp(6px, 1.5vw, 12px)',
            borderRadius: '6px',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Avatar icon={<UserOutlined />} size={window.innerWidth < 768 ? 'small' : 'default'} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(4px, 1vw, 8px)' }}>
              <Text 
                strong 
                style={{ 
                  color: '#1890ff',
                  fontSize: 'clamp(12px, 2.5vw, 16px)',
                  whiteSpace: 'nowrap'
                }}
              >
                {user?.username || '门卫'}
              </Text>
              <Text type="secondary" style={{ 
                fontSize: 'clamp(10px, 2vw, 14px)',
                whiteSpace: 'nowrap'
              }}>
                ({user?.role === 'guard' ? '门卫' : '用户'})
              </Text>
            </div>
          </div>
        </Dropdown>
      </div>
    </Header>
  )

  // 渲染快捷功能按钮
  const renderQuickButtons = () => {
    const buttons = [
      { key: 'entry', label: t('guard.entryRegistration'), icon: <UserAddOutlined />, color: '#1890ff', onClick: handleEntryRegistration },
      { key: 'borrow', label: t('guard.borrowReturn'), icon: <ShoppingCartOutlined />, color: '#52c41a', onClick: handleItemBorrowing },
      { key: 'exit', label: t('guard.exitRegistration'), icon: <LogoutOutlined />, color: '#fa541c', onClick: handleExitProcess },
      { key: 'reports', label: t('guard.reports'), icon: <BarChartOutlined />, color: '#722ed1', onClick: handleReports }
    ]

    return (
      <div style={{ 
        marginBottom: '24px',
        padding: '16px',
        background: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #e9ecef'
      }}>
        <Text strong style={{ marginBottom: '12px', display: 'block' }}>快速功能：</Text>
        <Space wrap>
          {buttons.map(button => (
            <Button
              key={button.key}
              type="default"
              icon={button.icon}
              onClick={button.onClick}
                  style={{
                    color: button.key === 'entry' && currentView === 'entry' ? '#fff' : 
                           button.key === 'borrow' && currentView === 'borrow' ? '#fff' :
                           button.key === 'exit' && currentView === 'exit' ? '#fff' :
                           button.key === 'reports' && currentView === 'reports' ? '#fff' :
                           button.color,
                    borderColor: button.color,
                    backgroundColor: button.key === 'entry' && currentView === 'entry' ? '#1890ff' : 
                                   button.key === 'borrow' && currentView === 'borrow' ? '#52c41a' :
                                   button.key === 'exit' && currentView === 'exit' ? '#fa541c' :
                                   button.key === 'reports' && currentView === 'reports' ? '#722ed1' :
                                   'transparent',
                    height: window.innerWidth >= 768 ? '48px' : '40px',
                    fontSize: window.innerWidth >= 768 ? 'clamp(16px, 2.5vw, 22px)' : 'clamp(14px, 2vw, 20px)',
                    padding: window.innerWidth >= 768 ? '0 16px' : '0 12px'
                  }}
            >
              {button.label}
            </Button>
          ))}
        </Space>
      </div>
    )
  }

  // 物品借用记录Modal
  const renderItemRecordsModal = () => {
    if (!selectedRecord) return null

    // 模拟物品借用记录数据
    const mockItemRecords = [
      { id: '1', itemName: '安全帽', itemId: 'ITEM001', borrowTime: '2024-01-15 08:30:00', returnTime: '2024-01-15 17:30:00', status: 'returned' },
      { id: '2', itemName: '防护手套', itemId: 'ITEM002', borrowTime: '2024-01-15 09:00:00', returnTime: null, status: 'borrowed' },
      { id: '3', itemName: '工具包', itemId: 'ITEM003', borrowTime: '2024-01-15 10:15:00', returnTime: '2024-01-15 16:45:00', status: 'returned' },
    ]

    const itemColumns = [
      {
        title: '物品类型',
        dataIndex: 'itemName',
        key: 'itemName',
      },
      {
        title: '物品编号',
        dataIndex: 'itemId',
        key: 'itemId',
      },
      {
        title: '借用时间',
        dataIndex: 'borrowTime',
        key: 'borrowTime',
      },
      {
        title: '归还时间',
        dataIndex: 'returnTime',
        key: 'returnTime',
        render: (value: string | null) => value || '-',
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: (status: string) => (
          <Tag color={status === 'returned' ? 'green' : 'orange'}>
            {status === 'returned' ? '已归还' : '未归还'}
          </Tag>
        ),
      },
    ]

    return (
      <Modal
        title={`${selectedRecord.workerName} 的物品借用记录`}
        open={itemRecordsModalVisible}
        onCancel={() => setItemRecordsModalVisible(false)}
        footer={null}
        width={800}
      >
        <div style={{ marginBottom: '16px' }}>
          <Text strong>工人信息：</Text>
          <div style={{ marginTop: '8px', padding: '12px', background: '#f8f9fa', borderRadius: '6px' }}>
            <Row gutter={16}>
              <Col span={8}>
                <Text type="secondary">工号：</Text>
                <Text strong>{selectedRecord.workerId}</Text>
              </Col>
              <Col span={8}>
                <Text type="secondary">姓名：</Text>
                <Text strong>{selectedRecord.workerName}</Text>
              </Col>
              <Col span={8}>
                <Text type="secondary">电话：</Text>
                <Text strong>{selectedRecord.phone}</Text>
              </Col>
            </Row>
          </div>
        </div>
        
        <Table
          columns={itemColumns}
          dataSource={mockItemRecords}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Modal>
    )
  }

  // 用户中心Modal
  const renderUserCenterModal = () => (
    <Modal
      title="用户中心"
      open={userCenterModalVisible}
      onCancel={() => setUserCenterModalVisible(false)}
      footer={null}
      width={500}
    >
      <div style={{ marginBottom: '24px' }}>
        <Space>
          <Avatar size={64} icon={<UserOutlined />} />
          <div>
            <Title level={4} style={{ margin: 0 }}>{user?.username || '门卫'}</Title>
            <Text type="secondary">{user?.role === 'guard' ? '门卫' : '用户'}</Text>
            <br />
            <Text type="secondary">工地：{user?.siteName || '未知工地'}</Text>
          </div>
        </Space>
      </div>
      
      <Divider />
      
      <Form
        form={passwordForm}
        onFinish={handlePasswordChange}
        layout="vertical"
      >
        <Form.Item
          label="当前密码"
          name="oldPassword"
          rules={[{ required: true, message: '请输入当前密码' }]}
        >
          <Input.Password placeholder="请输入当前密码" />
        </Form.Item>
        
        <Form.Item
          label="新密码"
          name="newPassword"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 6, message: '密码长度至少6位' }
          ]}
        >
          <Input.Password placeholder="请输入新密码" />
        </Form.Item>
        
        <Form.Item
          label="确认新密码"
          name="confirmPassword"
          rules={[
            { required: true, message: '请确认新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve()
                }
                return Promise.reject(new Error('两次输入的密码不一致'))
              },
            }),
          ]}
        >
          <Input.Password placeholder="请再次输入新密码" />
        </Form.Item>
        
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              修改密码
            </Button>
            <Button onClick={() => setUserCenterModalVisible(false)}>
              取消
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  )

  // 主页面
  if (currentView === 'main') {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        {renderHeader()}
        <div style={{ 
          padding: '24px',
          marginTop: '64px',
          minHeight: 'calc(100vh - 64px)'
        }}>
        
        {/* 统计卡片 */}
        <style>
          {`
            @media (max-width: 1200px) {
              .ant-statistic-title {
                display: none !important;
              }
            }
          `}
        </style>
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={12}>
            <Card style={{ height: '140px' }}>
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div 
                    style={{ 
                      flex: 1, 
                      textAlign: 'center', 
                      padding: '0 4px',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      transition: 'background-color 0.2s'
                    }}
                    onClick={() => handleStatClick('all')}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Statistic
                      title="今日入场"
                      value={totalEnteredToday}
                      prefix={<UserAddOutlined style={{ fontSize: 'clamp(18px, 3vw, 24px)' }} />}
                      valueStyle={{ 
                        color: '#52c41a',
                        fontSize: 'clamp(20px, 4vw, 28px)',
                        fontWeight: 'bold'
                      }}
                    />
                  </div>
                  <div style={{ width: '1px', height: '50px', background: '#f0f0f0', margin: '0 6px' }}></div>
                  <div 
                    style={{ 
                      flex: 1, 
                      textAlign: 'center', 
                      padding: '0 4px',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      transition: 'background-color 0.2s'
                    }}
                    onClick={() => handleStatClick('out')}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Statistic
                      title="已离场"
                      value={totalExitedToday}
                      prefix={<UserOutlined style={{ fontSize: 'clamp(18px, 3vw, 24px)' }} />}
                      valueStyle={{ 
                        color: '#1890ff',
                        fontSize: 'clamp(20px, 4vw, 28px)',
                        fontWeight: 'bold'
                      }}
                    />
                  </div>
                  <div style={{ width: '1px', height: '50px', background: '#f0f0f0', margin: '0 6px' }}></div>
                  <div 
                    style={{ 
                      flex: 1, 
                      textAlign: 'center', 
                      padding: '0 4px',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      transition: 'background-color 0.2s'
                    }}
                    onClick={() => handleStatClick('in')}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Statistic
                      title="未离场"
                      value={currentOnSite}
                      prefix={<UserOutlined style={{ fontSize: 'clamp(18px, 3vw, 24px)' }} />}
                      valueStyle={{ 
                        color: '#ff4d4f',
                        fontSize: 'clamp(20px, 4vw, 28px)',
                        fontWeight: 'bold'
                      }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </Col>
          <Col span={12}>
            <Card style={{ height: '140px' }}>
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1, textAlign: 'center', padding: '0 4px' }}>
                    <Statistic
                      title="借出物品"
                      value={totalBorrowedItems}
                      prefix={<ShoppingCartOutlined style={{ fontSize: 'clamp(18px, 3vw, 24px)' }} />}
                      valueStyle={{ 
                        color: '#1890ff',
                        fontSize: 'clamp(20px, 4vw, 28px)',
                        fontWeight: 'bold'
                      }}
                    />
                  </div>
                  <div style={{ width: '1px', height: '50px', background: '#f0f0f0', margin: '0 6px' }}></div>
                  <div style={{ flex: 1, textAlign: 'center', padding: '0 4px' }}>
                    <Statistic
                      title="待归还物品"
                      value={totalUnreturnedItems}
                      prefix={<ShoppingCartOutlined style={{ fontSize: 'clamp(18px, 3vw, 24px)' }} />}
                      valueStyle={{ 
                        color: '#ff4d4f',
                        fontSize: 'clamp(20px, 4vw, 28px)',
                        fontWeight: 'bold'
                      }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* 功能按钮 - 2×2布局 */}
        <Row gutter={[24, 24]}>
          <Col span={12}>
            <Card 
              hoverable
              style={{ textAlign: 'center', height: '200px' }}
              onClick={handleEntryRegistration}
            >
              <UserAddOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
              <Title level={4}>{t('guard.entryRegistration')}</Title>
              <Text type="secondary">{t('guard.entryDescription')}</Text>
            </Card>
          </Col>
          <Col span={12}>
            <Card 
              hoverable
              style={{ textAlign: 'center', height: '200px' }}
              onClick={handleItemBorrowing}
            >
              <ShoppingCartOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: '16px' }} />
              <Title level={4}>{t('guard.borrowReturn')}</Title>
              <Text type="secondary">{t('guard.borrowDescription')}</Text>
            </Card>
          </Col>
          <Col span={12}>
            <Card 
              hoverable
              style={{ textAlign: 'center', height: '200px' }}
              onClick={handleExitProcess}
            >
              <LogoutOutlined style={{ fontSize: '48px', color: '#fa541c', marginBottom: '16px' }} />
              <Title level={4}>{t('guard.exitRegistration')}</Title>
              <Text type="secondary">{t('guard.exitDescription')}</Text>
            </Card>
          </Col>
          <Col span={12}>
            <Card 
              hoverable
              style={{ textAlign: 'center', height: '200px' }}
              onClick={handleReports}
            >
              <BarChartOutlined style={{ fontSize: '48px', color: '#722ed1', marginBottom: '16px' }} />
              <Title level={4}>报表查看</Title>
              <Text type="secondary">查看访客记录和统计</Text>
            </Card>
          </Col>
        </Row>
        </div>
        {renderUserCenterModal()}
      </Layout>
    )
  }

  // 入场登记页面
  if (currentView === 'entry') {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        {renderHeader()}
        <div style={{ 
          padding: '16px',
          margin: '64px 0 0 0',
          width: '100%',
          minHeight: 'calc(100vh - 64px)',
          fontSize: 'clamp(16px, 2.5vw, 22px)'
        }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: window.innerWidth < 768 ? 'column' : 'row',
            justifyContent: 'space-between', 
            alignItems: window.innerWidth < 768 ? 'flex-start' : 'center',
            marginBottom: '16px',
            gap: window.innerWidth < 768 ? '12px' : '0'
          }}>
            <Title level={2} style={{ margin: 0 }}>入场登记</Title>
            <Space wrap>
              {[
                { key: 'entry', label: '入场登记', icon: <UserAddOutlined />, color: '#1890ff', onClick: handleEntryRegistration },
                { key: 'borrow', label: '借/还物品', icon: <ShoppingCartOutlined />, color: '#52c41a', onClick: handleItemBorrowing },
                { key: 'exit', label: '离场登记', icon: <LogoutOutlined />, color: '#fa541c', onClick: handleExitProcess },
                { key: 'reports', label: '报表查看', icon: <BarChartOutlined />, color: '#722ed1', onClick: handleReports },
                { key: 'back', label: '返回', icon: <ArrowLeftOutlined />, color: '#666', onClick: handleBackToMain }
              ].map(button => (
                <Button
                  key={button.key}
                  type="default"
                  icon={button.icon}
                  onClick={button.onClick}
                  style={{
                    color: button.key === 'entry' && currentView === 'entry' ? '#fff' : 
                           button.key === 'borrow' && currentView === 'borrow' ? '#fff' :
                           button.key === 'exit' && currentView === 'exit' ? '#fff' :
                           button.key === 'reports' && currentView === 'reports' ? '#fff' :
                           button.color,
                    borderColor: button.color,
                    backgroundColor: button.key === 'entry' && currentView === 'entry' ? '#1890ff' : 
                                   button.key === 'borrow' && currentView === 'borrow' ? '#52c41a' :
                                   button.key === 'exit' && currentView === 'exit' ? '#fa541c' :
                                   button.key === 'reports' && currentView === 'reports' ? '#722ed1' :
                                   'transparent',
                    height: window.innerWidth >= 768 ? '48px' : '40px',
                    fontSize: window.innerWidth >= 768 ? 'clamp(16px, 2.5vw, 22px)' : 'clamp(14px, 2vw, 20px)',
                    padding: window.innerWidth >= 768 ? '0 16px' : '0 12px'
                  }}
                >
                  {button.label}
                </Button>
              ))}
            </Space>
          </div>
        
        <Card style={{ padding: '0 24px' }}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div>
              <Text strong style={{ fontSize: 'clamp(18px, 3vw, 24px)' }}>1. 输入二维码编号/实体卡编号：</Text>
              <Input
                placeholder="请输入二维码编号或实体卡编号（必填）"
                value={scannedWorkerId}
                onChange={(e) => setScannedWorkerId(e.target.value)}
                prefix={<QrcodeOutlined />}
                suffix={
                  <Button 
                    type="primary" 
                    size="small"
                    onClick={handleScanWorkerId}
                    style={{ marginRight: '-8px' }}
                  >
                    查询
                  </Button>
                }
                style={{ marginTop: '8px', height: '48px', fontSize: 'clamp(16px, 2.5vw, 22px)' }}
                onPressEnter={handleScanWorkerId}
              />
            </div>

            {selectedWorker && (
              <>
                <div>
                  <Text strong style={{ fontSize: 'clamp(18px, 3vw, 24px)' }}>2. 工人信息确认：</Text>
                  <Card size="small" style={{ marginTop: '8px' }}>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <div>
                        <Text type="secondary" style={{ fontSize: 'clamp(16px, 2.5vw, 22px)' }}>姓名：</Text>
                        <Text strong style={{ fontSize: 'clamp(18px, 3vw, 24px)', marginLeft: '8px' }}>{selectedWorker.name}</Text>
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 'clamp(16px, 2.5vw, 22px)' }}>身份证号：</Text>
                        <Text strong style={{ fontSize: 'clamp(18px, 3vw, 24px)', marginLeft: '8px' }}>{selectedWorker.idCard}</Text>
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 'clamp(16px, 2.5vw, 22px)' }}>联系方式：</Text>
                        <Input
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="请输入联系电话"
                          prefix={<PhoneOutlined />}
                          style={{ width: '250px', marginLeft: '8px', height: '40px', fontSize: 'clamp(16px, 2.5vw, 22px)' }}
                        />
                      </div>
                    </Space>
                  </Card>
                </div>

                <div>
                  <Text strong style={{ fontSize: 'clamp(18px, 3vw, 24px)' }}>3. 实体卡编号：</Text>
                  <Input
                    placeholder="请输入实体卡编号（必填）"
                    value={physicalCardId}
                    onChange={(e) => setPhysicalCardId(e.target.value)}
                    prefix={<IdcardOutlined />}
                    style={{ marginTop: '8px', height: '48px', fontSize: 'clamp(16px, 2.5vw, 22px)' }}
                  />
                </div>


                <Button 
                  type="primary" 
                  size="large"
                  onClick={handleCompleteEntry}
                  style={{ width: '100%', height: '56px', fontSize: 'clamp(18px, 3vw, 24px)' }}
                >
                  登记入场
                </Button>
              </>
            )}
          </Space>
        </Card>
        </div>
        {renderUserCenterModal()}
      </Layout>
    )
  }

  // 借/还物品页面
  if (currentView === 'borrow') {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        {renderHeader()}
        <div style={{ 
          padding: '16px',
          margin: '64px 0 0 0',
          width: '100%',
          minHeight: 'calc(100vh - 64px)',
          fontSize: 'clamp(16px, 2.5vw, 22px)'
        }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: window.innerWidth < 768 ? 'column' : 'row',
            justifyContent: 'space-between', 
            alignItems: window.innerWidth < 768 ? 'flex-start' : 'center',
            marginBottom: '16px',
            gap: window.innerWidth < 768 ? '12px' : '0'
          }}>
            <Title level={2} style={{ margin: 0 }}>借/还物品</Title>
            <Space wrap>
              {[
                { key: 'entry', label: '入场登记', icon: <UserAddOutlined />, color: '#1890ff', onClick: handleEntryRegistration },
                { key: 'borrow', label: '借/还物品', icon: <ShoppingCartOutlined />, color: '#52c41a', onClick: handleItemBorrowing },
                { key: 'exit', label: '离场登记', icon: <LogoutOutlined />, color: '#fa541c', onClick: handleExitProcess },
                { key: 'reports', label: '报表查看', icon: <BarChartOutlined />, color: '#722ed1', onClick: handleReports },
                { key: 'back', label: '返回', icon: <ArrowLeftOutlined />, color: '#666', onClick: handleBackToMain }
              ].map(button => (
                <Button
                  key={button.key}
                  type="default"
                  icon={button.icon}
                  onClick={button.onClick}
                  style={{
                    color: button.key === 'entry' && currentView === 'entry' ? '#fff' : 
                           button.key === 'borrow' && currentView === 'borrow' ? '#fff' :
                           button.key === 'exit' && currentView === 'exit' ? '#fff' :
                           button.key === 'reports' && currentView === 'reports' ? '#fff' :
                           button.color,
                    borderColor: button.color,
                    backgroundColor: button.key === 'entry' && currentView === 'entry' ? '#1890ff' : 
                                   button.key === 'borrow' && currentView === 'borrow' ? '#52c41a' :
                                   button.key === 'exit' && currentView === 'exit' ? '#fa541c' :
                                   button.key === 'reports' && currentView === 'reports' ? '#722ed1' :
                                   'transparent',
                    height: window.innerWidth >= 768 ? '48px' : '40px',
                    fontSize: window.innerWidth >= 768 ? 'clamp(16px, 2.5vw, 22px)' : 'clamp(14px, 2vw, 20px)',
                    padding: window.innerWidth >= 768 ? '0 16px' : '0 12px'
                  }}
                >
                  {button.label}
                </Button>
              ))}
            </Space>
          </div>
        
        <Card style={{ padding: '0 24px' }}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div>
              <Text strong style={{ fontSize: 'clamp(18px, 3vw, 24px)' }}>1. 输入二维码编号/实体卡编号：</Text>
              <Input
                placeholder="请输入二维码编号或实体卡编号（必填）"
                value={scannedWorkerId}
                onChange={(e) => setScannedWorkerId(e.target.value)}
                prefix={<QrcodeOutlined />}
                suffix={
                  <Button 
                    type="primary" 
                    size="small"
                    onClick={handleScanForBorrow}
                    style={{ marginRight: '-8px' }}
                  >
                    查询
                  </Button>
                }
                style={{ marginTop: '8px', height: '48px', fontSize: 'clamp(16px, 2.5vw, 22px)' }}
                onPressEnter={handleScanForBorrow}
              />
            </div>

            {selectedWorker && (
              <>
                <div>
                  <Text strong style={{ fontSize: 'clamp(18px, 3vw, 24px)' }}>2. 工人信息确认：</Text>
                  <Card size="small" style={{ marginTop: '8px' }}>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <div>
                        <Text type="secondary" style={{ fontSize: 'clamp(16px, 2.5vw, 22px)' }}>姓名：</Text>
                        <Text strong style={{ fontSize: 'clamp(18px, 3vw, 24px)', marginLeft: '8px' }}>{selectedWorker.name}</Text>
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 'clamp(16px, 2.5vw, 22px)' }}>身份证号：</Text>
                        <Text strong style={{ fontSize: 'clamp(18px, 3vw, 24px)', marginLeft: '8px' }}>
                          {selectedWorker.idCard ? 
                            (selectedWorker.idCard.length >= 8 ? 
                              `${selectedWorker.idCard.slice(0, 4)}****${selectedWorker.idCard.slice(-4)}` : 
                              selectedWorker.idCard
                            ) : '-'
                          }
                        </Text>
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 'clamp(16px, 2.5vw, 22px)' }}>电话号码：</Text>
                        <Text strong style={{ fontSize: 'clamp(18px, 3vw, 24px)', marginLeft: '8px' }}>{selectedWorker.phone || '-'}</Text>
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 'clamp(16px, 2.5vw, 22px)' }}>入场时间：</Text>
                        <Text strong style={{ fontSize: 'clamp(18px, 3vw, 24px)', marginLeft: '8px' }}>{selectedWorker.entryTime || '-'}</Text>
                      </div>
                    </Space>
                  </Card>
                </div>

                {/* 当前借用物品列表 */}
                {currentBorrowedItems.length > 0 && (
                  <div>
                    <Text strong style={{ fontSize: 'clamp(18px, 3vw, 24px)' }}>当前借用物品：</Text>
                    <Card size="small" style={{ marginTop: '8px' }}>
                      {currentBorrowedItems.map((item, index) => {
                        const itemKey = `${item.itemType}-${item.itemId}`
                        return (
                          <div key={index} style={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            padding: '8px 0',
                            borderBottom: index < currentBorrowedItems.length - 1 ? '1px solid #f0f0f0' : 'none'
                          }}>
                            <Checkbox
                              checked={selectedReturnItems.includes(itemKey)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedReturnItems([...selectedReturnItems, itemKey])
                                } else {
                                  setSelectedReturnItems(selectedReturnItems.filter(key => key !== itemKey))
                                }
                              }}
                              style={{ marginRight: '12px' }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ marginBottom: '4px' }}>
                                <Text strong style={{ fontSize: 'clamp(16px, 2.5vw, 22px)' }}>
                                  {item.itemType === 'safety_helmet' ? '安全帽' :
                                   item.itemType === 'safety_gloves' ? '防护手套' :
                                   item.itemType === 'tool_kit' ? '工具包' :
                                   item.itemType === 'safety_shoes' ? '安全鞋' :
                                   item.itemType === 'protective_clothing' ? '防护服' :
                                   item.itemType === 'other' ? '其他' : item.itemType}
                                </Text>
                              </div>
                              <div style={{ marginBottom: '4px' }}>
                                <Text type="secondary" style={{ fontSize: 'clamp(14px, 2vw, 18px)' }}>
                                  编号：{item.itemId}
                                </Text>
                              </div>
                              <div>
                                <Text type="secondary" style={{ fontSize: 'clamp(14px, 2vw, 18px)' }}>
                                  借用时间：{item.borrowTime}
                                </Text>
                              </div>
                              {item.remark && (
                                <div>
                                  <Text type="secondary" style={{ fontSize: 'clamp(14px, 2vw, 18px)' }}>
                                    备注：{item.remark}
                                  </Text>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </Card>
                    {selectedReturnItems.length > 0 && (
                      <Button 
                        type="primary" 
                        size="large"
                        onClick={handleBorrowReturnItems}
                        style={{ 
                          width: '100%', 
                          height: '48px', 
                          fontSize: 'clamp(16px, 2.5vw, 22px)',
                          marginTop: '12px'
                        }}
                      >
                        归还选中物品 ({selectedReturnItems.length}个)
                      </Button>
                    )}
                  </div>
                )}

                <div>
                  <Text strong style={{ fontSize: 'clamp(18px, 3vw, 24px)' }}>3. 物品类型：</Text>
                  <Select
                    placeholder="请选择物品类型（必填）"
                    value={selectedItemType}
                    onChange={setSelectedItemType}
                    style={{ 
                      marginTop: '8px', 
                      width: '100%', 
                      height: '48px',
                      fontSize: 'clamp(18px, 3vw, 24px)'
                    }}
                    size="large"
                  >
                    <Option value="safety_helmet">安全帽</Option>
                    <Option value="safety_gloves">防护手套</Option>
                    <Option value="tool_kit">工具包</Option>
                    <Option value="safety_shoes">安全鞋</Option>
                    <Option value="protective_clothing">防护服</Option>
                    <Option value="other">其他</Option>
                  </Select>
                </div>

                <div>
                  <Text strong style={{ fontSize: 'clamp(18px, 3vw, 24px)' }}>4. 物品编号：</Text>
                  <Input
                    placeholder="请输入物品编号（必填）"
                    value={itemNumber}
                    onChange={(e) => setItemNumber(e.target.value)}
                    style={{ marginTop: '8px', height: '48px', fontSize: 'clamp(18px, 3vw, 24px)' }}
                  />
                </div>

                <Button 
                  type="primary" 
                  size="large"
                  onClick={handleAddItemToList}
                  style={{ 
                    width: '100%', 
                    height: '48px', 
                    fontSize: 'clamp(16px, 2.5vw, 22px)', 
                    marginTop: '16px',
                    backgroundColor: '#73d13d',
                    borderColor: '#73d13d',
                    color: '#fff'
                  }}
                >
                  添加物品到借用列表
                </Button>

                {/* 借用物品列表 */}
                {borrowItemsList.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <Text strong style={{ fontSize: 'clamp(18px, 3vw, 24px)' }}>借用物品列表：</Text>
                    <Card size="small" style={{ marginTop: '8px' }}>
                      {borrowItemsList.map((item, index) => (
                        <div key={index} style={{ 
                          padding: '12px 0',
                          borderBottom: index < borrowItemsList.length - 1 ? '1px solid #f0f0f0' : 'none'
                        }}>
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'flex-start',
                            marginBottom: '8px'
                          }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ marginBottom: '4px' }}>
                                <Text strong style={{ fontSize: 'clamp(16px, 2.5vw, 22px)' }}>
                                  {item.itemType === 'safety_helmet' ? '安全帽' :
                                   item.itemType === 'safety_gloves' ? '防护手套' :
                                   item.itemType === 'tool_kit' ? '工具包' :
                                   item.itemType === 'safety_shoes' ? '安全鞋' :
                                   item.itemType === 'protective_clothing' ? '防护服' :
                                   item.itemType === 'other' ? '其他' : item.itemType}
                                </Text>
                              </div>
                              <div>
                                <Text type="secondary" style={{ fontSize: 'clamp(14px, 2vw, 18px)' }}>
                                  编号：{item.itemId}
                                </Text>
                              </div>
                            </div>
                            <Button 
                              type="text" 
                              danger
                              size="small"
                              onClick={() => handleRemoveItemFromList(index)}
                              style={{ fontSize: 'clamp(14px, 2vw, 18px)', marginLeft: '8px' }}
                            >
                              删除
                            </Button>
                          </div>
                          <div>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '8px',
                              marginBottom: item.showRemark ? '8px' : '0'
                            }}>
                              <Button 
                                type="text" 
                                size="small"
                                onClick={() => {
                                  const newList = [...borrowItemsList]
                                  newList[index].showRemark = !newList[index].showRemark
                                  setBorrowItemsList(newList)
                                }}
                                style={{ 
                                  fontSize: 'clamp(12px, 1.8vw, 16px)',
                                  padding: '0',
                                  height: 'auto',
                                  color: item.showRemark ? '#1890ff' : '#666'
                                }}
                              >
                                {item.showRemark ? '收起备注' : '添加备注'}
                              </Button>
                              {item.remark && !item.showRemark && (
                                <Text type="secondary" style={{ fontSize: 'clamp(12px, 1.8vw, 16px)' }}>
                                  已填写备注
                                </Text>
                              )}
                            </div>
                            {item.showRemark && (
                              <Input.TextArea
                                placeholder="请输入该物品的备注信息（可选）"
                                value={item.remark}
                                onChange={(e) => {
                                  const newList = [...borrowItemsList]
                                  newList[index].remark = e.target.value
                                  setBorrowItemsList(newList)
                                }}
                                style={{ 
                                  fontSize: 'clamp(14px, 2vw, 18px)',
                                  minHeight: '32px',
                                  maxHeight: '64px'
                                }}
                                autoSize={{ minRows: 1, maxRows: 2 }}
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </Card>
                  </div>
                )}

                <Button 
                  type="primary" 
                  size="large"
                  onClick={handleCompleteBorrow}
                  disabled={borrowItemsList.length === 0}
                  style={{ 
                    width: '100%', 
                    height: '56px', 
                    fontSize: 'clamp(18px, 3vw, 24px)',
                    marginTop: '16px'
                  }}
                >
                  完成借物登记 {borrowItemsList.length > 0 && `(${borrowItemsList.length}个物品)`}
                </Button>
              </>
            )}
          </Space>
        </Card>
        </div>
        {renderUserCenterModal()}
      </Layout>
    )
  }

  // 离场登记页面
  if (currentView === 'exit') {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        {renderHeader()}
        <div style={{ 
          padding: '16px',
          margin: '64px 0 0 0',
          width: '100%',
          minHeight: 'calc(100vh - 64px)',
          fontSize: 'clamp(16px, 2.5vw, 22px)'
        }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: window.innerWidth < 768 ? 'column' : 'row',
            justifyContent: 'space-between', 
            alignItems: window.innerWidth < 768 ? 'flex-start' : 'center',
            marginBottom: '16px',
            gap: window.innerWidth < 768 ? '12px' : '0'
          }}>
            <Title level={2} style={{ margin: 0 }}>离场登记</Title>
            <Space wrap>
              {[
                { key: 'entry', label: '入场登记', icon: <UserAddOutlined />, color: '#1890ff', onClick: handleEntryRegistration },
                { key: 'borrow', label: '借/还物品', icon: <ShoppingCartOutlined />, color: '#52c41a', onClick: handleItemBorrowing },
                { key: 'exit', label: '离场登记', icon: <LogoutOutlined />, color: '#fa541c', onClick: handleExitProcess },
                { key: 'reports', label: '报表查看', icon: <BarChartOutlined />, color: '#722ed1', onClick: handleReports },
                { key: 'back', label: '返回', icon: <ArrowLeftOutlined />, color: '#666', onClick: handleBackToMain }
              ].map(button => (
                <Button
                  key={button.key}
                  type="default"
                  icon={button.icon}
                  onClick={button.onClick}
                  style={{
                    color: button.key === 'entry' && currentView === 'entry' ? '#fff' : 
                           button.key === 'borrow' && currentView === 'borrow' ? '#fff' :
                           button.key === 'exit' && currentView === 'exit' ? '#fff' :
                           button.key === 'reports' && currentView === 'reports' ? '#fff' :
                           button.color,
                    borderColor: button.color,
                    backgroundColor: button.key === 'entry' && currentView === 'entry' ? '#1890ff' : 
                                   button.key === 'borrow' && currentView === 'borrow' ? '#52c41a' :
                                   button.key === 'exit' && currentView === 'exit' ? '#fa541c' :
                                   button.key === 'reports' && currentView === 'reports' ? '#722ed1' :
                                   'transparent',
                    height: window.innerWidth >= 768 ? '48px' : '40px',
                    fontSize: window.innerWidth >= 768 ? 'clamp(16px, 2.5vw, 22px)' : 'clamp(14px, 2vw, 20px)',
                    padding: window.innerWidth >= 768 ? '0 16px' : '0 12px'
                  }}
                >
                  {button.label}
                </Button>
              ))}
            </Space>
          </div>
        
        <Card style={{ padding: '0 24px' }}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div>
              <Text strong style={{ fontSize: 'clamp(18px, 3vw, 24px)' }}>1. 输入二维码编号/实体卡编号：</Text>
              <Input
                placeholder="请输入二维码编号或实体卡编号（必填）"
                value={scannedWorkerId}
                onChange={(e) => setScannedWorkerId(e.target.value)}
                prefix={<QrcodeOutlined />}
                suffix={
                  <Button 
                    type="primary" 
                    size="small"
                    onClick={handleScanForExit}
                    style={{ marginRight: '-8px' }}
                  >
                    查询
                  </Button>
                }
                style={{ marginTop: '8px', height: '48px', fontSize: 'clamp(16px, 2.5vw, 22px)' }}
                onPressEnter={handleScanForExit}
              />
            </div>

            {selectedWorker && (
              <>
                <div>
                  <Text strong style={{ fontSize: 'clamp(18px, 3vw, 24px)' }}>2. 工人信息确认：</Text>
                  <Card size="small" style={{ marginTop: '8px' }}>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <div>
                        <Text type="secondary" style={{ fontSize: 'clamp(16px, 2.5vw, 22px)' }}>姓名：</Text>
                        <Text strong style={{ fontSize: 'clamp(18px, 3vw, 24px)', marginLeft: '8px' }}>{selectedWorker.name}</Text>
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 'clamp(16px, 2.5vw, 22px)' }}>身份证号：</Text>
                        <Text strong style={{ fontSize: 'clamp(18px, 3vw, 24px)', marginLeft: '8px' }}>
                          {selectedWorker.idCard ? 
                            (selectedWorker.idCard.length >= 8 ? 
                              `${selectedWorker.idCard.slice(0, 4)}****${selectedWorker.idCard.slice(-4)}` : 
                              selectedWorker.idCard
                            ) : '-'
                          }
                        </Text>
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 'clamp(16px, 2.5vw, 22px)' }}>电话号码：</Text>
                        <Text strong style={{ fontSize: 'clamp(18px, 3vw, 24px)', marginLeft: '8px' }}>{selectedWorker.phone || '-'}</Text>
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 'clamp(16px, 2.5vw, 22px)' }}>入场时间：</Text>
                        <Text strong style={{ fontSize: 'clamp(18px, 3vw, 24px)', marginLeft: '8px' }}>{selectedWorker.entryTime || '-'}</Text>
                      </div>
                    </Space>
                  </Card>
                </div>

                <div>
                  <Text strong style={{ fontSize: 'clamp(18px, 3vw, 24px)' }}>3. 借物明细：</Text>
                  <Card size="small" style={{ marginTop: '8px' }}>
                    {selectedWorker.borrowedItems && selectedWorker.borrowedItems.length > 0 ? (
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        {selectedWorker.borrowedItems.map((item: any, index: number) => (
                          <div key={index} style={{ 
                            padding: '12px',
                            border: '1px solid #f0f0f0',
                            borderRadius: '4px',
                            marginBottom: '8px'
                          }}>
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              marginBottom: item.returnTime ? '0' : '8px'
                            }}>
                              <div>
                                <Text strong style={{ fontSize: 'clamp(16px, 2.5vw, 22px)' }}>
                                  {item.itemType} - {item.itemId}
                                </Text>
                                {item.remark && (
                                  <div>
                                    <Text type="secondary" style={{ fontSize: 'clamp(14px, 2vw, 18px)' }}>
                                      备注：{item.remark}
                                    </Text>
                                  </div>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {item.returnTime ? (
                                  <Tag color="green" style={{ fontSize: 'clamp(14px, 2vw, 18px)' }}>已归还</Tag>
                                ) : (
                                  <>
                                    <input
                                      type="checkbox"
                                      checked={selectedBorrowedItems.includes(item.itemId)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedBorrowedItems([...selectedBorrowedItems, item.itemId])
                                        } else {
                                          setSelectedBorrowedItems(selectedBorrowedItems.filter(id => id !== item.itemId))
                                        }
                                      }}
                                      style={{ transform: 'scale(1.2)' }}
                                    />
                                    <Tag color="orange" style={{ fontSize: 'clamp(14px, 2vw, 18px)' }}>未归还</Tag>
                                  </>
                                )}
                              </div>
                            </div>
                            {!item.returnTime && !selectedBorrowedItems.includes(item.itemId) && (
                              <div>
                                <Text type="secondary" style={{ fontSize: 'clamp(14px, 2vw, 18px)' }}>
                                  未归还原因备注（必填）：
                                </Text>
                                <Input.TextArea
                                  placeholder="请填写未归还原因..."
                                  value={unreturnedItemRemarks[item.itemId] || ''}
                                  onChange={(e) => {
                                    setUnreturnedItemRemarks({
                                      ...unreturnedItemRemarks,
                                      [item.itemId]: e.target.value
                                    })
                                  }}
                                  style={{ 
                                    marginTop: '4px',
                                    fontSize: 'clamp(14px, 2vw, 18px)'
                                  }}
                                  autoSize={{ minRows: 1, maxRows: 2 }}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </Space>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 'clamp(16px, 2.5vw, 22px)' }}>无借物记录</Text>
                    )}
                  </Card>
                </div>

                {selectedWorker.borrowedItems && selectedWorker.borrowedItems.some((item: any) => !item.returnTime) && (
                  <div>
                    <Text strong style={{ fontSize: 'clamp(18px, 3vw, 24px)' }}>4. 物品归还：</Text>
                    <div style={{ marginTop: '8px' }}>
                      <Button 
                        type="primary"
                        onClick={handleReturnItems}
                        disabled={selectedBorrowedItems.length === 0}
                        style={{ 
                          height: '48px', 
                          fontSize: 'clamp(16px, 2.5vw, 22px)',
                          marginRight: '12px'
                        }}
                      >
                        归还选中物品 ({selectedBorrowedItems.length})
                      </Button>
                      <Text type="secondary" style={{ fontSize: 'clamp(14px, 2vw, 18px)' }}>
                        请勾选要归还的物品，然后点击归还按钮
                      </Text>
                    </div>
                  </div>
                )}

                <div>
                  <Text strong style={{ fontSize: 'clamp(18px, 3vw, 24px)' }}>
                    {selectedWorker.borrowedItems && selectedWorker.borrowedItems.some((item: any) => !item.returnTime) ? '5. 实体卡归还：' : '4. 实体卡归还：'}
                  </Text>
                  <Card size="small" style={{ marginTop: '8px' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '8px'
                    }}>
                      <div>
                        <Text strong style={{ fontSize: 'clamp(16px, 2.5vw, 22px)' }}>
                          实体卡：{selectedWorker.physicalCardId}
                        </Text>
                        <div>
                          <Text type="secondary" style={{ fontSize: 'clamp(14px, 2vw, 18px)' }}>
                            请确认实体卡已收回
                          </Text>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="checkbox"
                          checked={physicalCardReturned}
                          onChange={(e) => setPhysicalCardReturned(e.target.checked)}
                          style={{ transform: 'scale(1.2)' }}
                        />
                        <Tag color={physicalCardReturned ? "green" : "orange"} style={{ fontSize: 'clamp(14px, 2vw, 18px)' }}>
                          {physicalCardReturned ? '已归还' : '未归还'}
                        </Tag>
                      </div>
                    </div>
                  </Card>
                </div>

                <Button 
                  type="primary" 
                  size="large"
                  onClick={handleCompleteExit}
                  style={{ 
                    width: '100%', 
                    height: '56px', 
                    fontSize: 'clamp(18px, 3vw, 24px)',
                    marginTop: '16px'
                  }}
                  disabled={!canCompleteExit()}
                >
                  完成离场登记
                </Button>
              </>
            )}
          </Space>
        </Card>
        </div>
        {renderUserCenterModal()}
      </Layout>
    )
  }

  // 报表页面
  if (currentView === 'reports') {
    const columns = [
      {
        title: '工号',
        dataIndex: 'workerId',
        key: 'workerId',
        width: 100,
      },
      {
        title: '姓名',
        dataIndex: 'workerName',
        key: 'workerName',
        width: 100,
      },
      {
        title: '身份证号',
        dataIndex: 'idCard',
        key: 'idCard',
        width: 140,
        render: (text: string) => {
          if (!text) return '-'
          // 显示前4位和后4位，中间用星号代替
          if (text.length >= 8) {
            return `${text.slice(0, 4)}****${text.slice(-4)}`
          }
          return text
        },
      },
      {
        title: '入场时间',
        dataIndex: 'entryTime',
        key: 'entryTime',
        width: 150,
      },
      {
        title: '离场时间',
        dataIndex: 'exitTime',
        key: 'exitTime',
        width: 150,
        render: (text: string) => text || '-',
      },
      {
        title: '实体卡编号',
        dataIndex: 'physicalCardId',
        key: 'physicalCardId',
        width: 120,
      },
      {
        title: '联系电话',
        dataIndex: 'phone',
        key: 'phone',
        width: 120,
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 80,
        render: (status: string) => (
          <Tag color={status === 'in' ? 'green' : 'red'}>
            {status === 'in' ? '在场' : '已离场'}
          </Tag>
        ),
      },
      {
        title: '借用物品',
        dataIndex: 'borrowedItems',
        key: 'borrowedItems',
        width: 100,
        render: (value: number, record: AttendanceRecord) => (
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
            onClick={() => handleViewItemRecords(record)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#bae7ff'
              e.currentTarget.style.borderColor = '#69c0ff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#e6f7ff'
              e.currentTarget.style.borderColor = '#91d5ff'
            }}
          >
            {value}
          </span>
        ),
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
        dataIndex: 'returnedItems',
        key: 'returnedItems',
        width: 100,
        render: (value: number, record: AttendanceRecord) => {
          const isPartiallyReturned = value > 0 && value < record.borrowedItems
          const isNotReturned = value === 0
          
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
              onClick={() => handleViewItemRecords(record)}
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
              {value}
            </span>
          )
        },
      },
    ]

    // 筛选当天的访客记录
    const todayRecords = attendanceRecords.filter(record => 
      dayjs(record.entryTime).isSame(dayjs(), 'day')
    )

    // 根据状态筛选记录
    const filteredRecords = todayRecords.filter(record => {
      if (statusFilter === 'all') return true
      return record.status === statusFilter
    })

    // 客户端分页处理
    const startIndex = (pagination.current - 1) * pagination.pageSize
    const endIndex = startIndex + pagination.pageSize
    const paginatedRecords = filteredRecords.slice(startIndex, endIndex)

    return (
      <Layout style={{ minHeight: '100vh' }}>
        {renderHeader()}
        <div style={{ 
          padding: '16px',
          margin: '64px 0 0 0',
          width: '100%',
          height: 'calc(100vh - 64px)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* 头部区域 */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ 
              display: 'flex', 
              flexDirection: window.innerWidth < 768 ? 'column' : 'row',
              justifyContent: 'space-between', 
              alignItems: window.innerWidth < 768 ? 'flex-start' : 'center',
              marginBottom: '16px',
              gap: window.innerWidth < 768 ? '12px' : '0'
            }}>
              <Title level={2} style={{ margin: 0 }}>今日访客记录</Title>
              <div               style={{ 
                display: 'flex', 
                alignItems: window.innerWidth < 768 ? 'flex-start' : 'center', 
                gap: '12px',
                flexDirection: window.innerWidth < 768 ? 'column' : 'row',
                width: window.innerWidth < 768 ? '100%' : 'auto'
              }}>
                {window.innerWidth >= 768 && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px'
                  }}>
                    <Text strong style={{ fontSize: window.innerWidth >= 768 ? 'clamp(16px, 2.5vw, 20px)' : 'clamp(14px, 2vw, 18px)' }}>状态筛选：</Text>
                    <Select
                      value={statusFilter}
                      onChange={handleStatusFilterChange}
                      style={{ 
                        width: 120,
                        fontSize: window.innerWidth >= 768 ? 'clamp(16px, 2.5vw, 20px)' : 'clamp(14px, 2vw, 18px)'
                      }}
                      size="small"
                    >
                      <Option value="all">全部</Option>
                      <Option value="in">在场</Option>
                      <Option value="out">已离场</Option>
                    </Select>
                    <Text type="secondary">
                      共 {filteredRecords.length} 条记录
                    </Text>
                  </div>
                )}
                
                <Space wrap>
                  {[
                    { key: 'entry', label: '入场登记', icon: <UserAddOutlined />, color: '#1890ff', onClick: handleEntryRegistration },
                    { key: 'borrow', label: '借/还物品', icon: <ShoppingCartOutlined />, color: '#52c41a', onClick: handleItemBorrowing },
                    { key: 'exit', label: '离场登记', icon: <LogoutOutlined />, color: '#fa541c', onClick: handleExitProcess },
                    { key: 'reports', label: '报表查看', icon: <BarChartOutlined />, color: '#722ed1', onClick: handleReports },
                    { key: 'back', label: '返回', icon: <ArrowLeftOutlined />, color: '#666', onClick: handleBackToMain }
                  ].map(button => (
                    <Button
                      key={button.key}
                      type="default"
                      icon={button.icon}
                      onClick={button.onClick}
                      style={{
                        color: button.key === 'entry' && currentView === 'entry' ? '#fff' : 
                               button.key === 'borrow' && currentView === 'borrow' ? '#fff' :
                               button.key === 'exit' && currentView === 'exit' ? '#fff' :
                               button.key === 'reports' && currentView === 'reports' ? '#fff' :
                               button.color,
                        borderColor: button.color,
                        backgroundColor: button.key === 'entry' && currentView === 'entry' ? '#1890ff' : 
                                       button.key === 'borrow' && currentView === 'borrow' ? '#52c41a' :
                                       button.key === 'exit' && currentView === 'exit' ? '#fa541c' :
                                       button.key === 'reports' && currentView === 'reports' ? '#722ed1' :
                                       'transparent',
                        height: window.innerWidth >= 768 ? '48px' : '40px',
                        fontSize: window.innerWidth >= 768 ? 'clamp(16px, 2.5vw, 22px)' : 'clamp(14px, 2vw, 20px)',
                        padding: window.innerWidth >= 768 ? '0 16px' : '0 12px'
                      }}
                    >
                      {button.label}
                    </Button>
                  ))}
                </Space>
              </div>
            </div>
            
            {/* 手机端状态筛选框 */}
            {window.innerWidth < 768 && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                marginBottom: '16px'
              }}>
                <Text strong>状态筛选：</Text>
                <Select
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                  style={{ width: 120 }}
                  size="small"
                >
                  <Option value="all">全部</Option>
                  <Option value="in">在场</Option>
                  <Option value="out">已离场</Option>
                </Select>
                <Text type="secondary">
                  共 {filteredRecords.length} 条记录
                </Text>
              </div>
            )}
          </div>

          {/* 表格区域 */}
          <div style={{ 
            flex: 1,
            background: '#fff',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <Table
                columns={columns}
                dataSource={paginatedRecords}
                rowKey="id"
                pagination={false}
                scroll={{ x: 1000 }}
                size="small"
                style={{
                  fontSize: window.innerWidth >= 768 ? 'clamp(18px, 3vw, 24px)' : 'clamp(14px, 2vw, 18px)'
                }}
              />
            </div>
          </div>

          {/* 固定底部分页栏 */}
          <div style={{ 
            flexShrink: 0,
            background: '#fff',
            padding: '12px 16px',
            borderTop: '1px solid #f0f0f0',
            boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.06)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center'
            }}>
              <Text type="secondary" style={{ 
                display: window.innerWidth < 768 ? 'none' : 'block'
              }}>
                第 {((pagination.current - 1) * pagination.pageSize) + 1}-{Math.min(pagination.current * pagination.pageSize, filteredRecords.length)} 条，共 {filteredRecords.length} 条记录
              </Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Text type="secondary">每页显示：</Text>
                <Select
                  value={pagination.pageSize}
                  onChange={(value) => handleTableChange(1, value)}
                  style={{ width: 80 }}
                  size="small"
                >
                  <Option value={5}>5</Option>
                  <Option value={10}>10</Option>
                  <Option value={20}>20</Option>
                  <Option value={50}>50</Option>
                  <Option value={100}>100</Option>
                </Select>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Button
                    size="small"
                    disabled={pagination.current === 1}
                    onClick={() => handleTableChange(pagination.current - 1)}
                  >
                    上一页
                  </Button>
                  <span style={{ margin: '0 8px' }}>
                    {pagination.current} / {Math.ceil(filteredRecords.length / pagination.pageSize)}
                  </span>
                  <Button
                    size="small"
                    disabled={pagination.current >= Math.ceil(filteredRecords.length / pagination.pageSize)}
                    onClick={() => handleTableChange(pagination.current + 1)}
                  >
                    下一页
                  </Button>
                  <div style={{ 
                    display: window.innerWidth < 768 ? 'none' : 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    marginLeft: '8px' 
                  }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>跳转至</Text>
                    <Input
                      size="small"
                      value={jumpPage}
                      onChange={(e) => setJumpPage(e.target.value)}
                      placeholder="页码"
                      style={{ width: 60 }}
                      onPressEnter={() => handleJumpToPage(filteredRecords.length)}
                    />
                    <Button
                      size="small"
                      onClick={() => handleJumpToPage(filteredRecords.length)}
                    >
                      确定
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {renderUserCenterModal()}
        {renderItemRecordsModal()}
      </Layout>
    )
  }


  return null
}

export default Guard
