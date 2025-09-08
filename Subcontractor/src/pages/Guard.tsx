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
  Dropdown
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
  ArrowLeftOutlined
} from '@ant-design/icons'
import { mockWorkers, mockSites, mockDistributors } from '../data/mockData'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
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
  status: 'in' | 'out'
  borrowedItems: number
  returnedItems: number
}

const Guard: React.FC = () => {
  // 认证和导航
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  
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
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [selectedBorrowedItems, setSelectedBorrowedItems] = useState<string[]>([])
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

    message.success('入场登记完成')
    setCurrentView('main')
  }

  // 2. 借物登记功能
  const handleItemBorrowing = () => {
    setCurrentView('borrow')
    setScannedWorkerId('')
    setSelectedWorker(null)
  }

  const handleScanForBorrow = () => {
    if (!scannedWorkerId.trim()) {
      message.error('请输入工人ID或实体卡ID')
      return
    }

    const worker = workers.find(w => 
      w.workerId === scannedWorkerId.trim() || w.physicalCardId === scannedWorkerId.trim()
    )
    
    if (!worker) {
      message.error('未找到该工人信息')
      return
    }

    if (worker.status === 'out') {
      message.error('该工人未入场，无法借物')
      return
    }

    setSelectedWorker(worker)
    setBorrowModalVisible(true)
    message.success('工人信息查询成功')
  }

  const handleCompleteBorrow = () => {
    if (!selectedWorker) {
      message.error('请先查询工人信息')
      return
    }

    if (!selectedItemType) {
      message.error('请选择物品类型')
      return
    }

    if (!itemNumber.trim()) {
      message.error('请输入物品编号')
      return
    }

    const newBorrowedItem = {
      itemType: selectedItemType,
      itemId: itemNumber.trim(),
      borrowTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      remark: borrowRemark.trim()
    }

    const updatedWorkers = workers.map(w => 
      w.id === selectedWorker.id 
        ? { 
            ...w, 
            borrowedItems: [...(w.borrowedItems || []), newBorrowedItem]
          }
        : w
    )
    setWorkers(updatedWorkers)

    // 更新考勤记录
    const updatedRecords = attendanceRecords.map(record => 
      record.workerId === selectedWorker.workerId
        ? { ...record, borrowedItems: record.borrowedItems + 1 }
        : record
    )
    setAttendanceRecords(updatedRecords)

    message.success('借物登记完成')
    setSelectedItemType('')
    setItemNumber('')
    setBorrowRemark('')
    setCurrentView('main')
  }

  // 3. 离场功能
  const handleExitProcess = () => {
    setCurrentView('exit')
    setScannedWorkerId('')
    setSelectedWorker(null)
  }

  const handleScanForExit = () => {
    if (!scannedWorkerId.trim()) {
      message.error('请输入工人ID或实体卡ID')
      return
    }

    const worker = workers.find(w => 
      w.workerId === scannedWorkerId.trim() || w.physicalCardId === scannedWorkerId.trim()
    )
    
    if (!worker) {
      message.error('未找到该工人信息')
      return
    }

    if (worker.status === 'out') {
      message.error('该工人未入场，无法离场')
      return
    }

    setSelectedWorker(worker)
    setExitModalVisible(true)
    message.success('工人信息查询成功')
  }

  const handleCompleteExit = () => {
    if (!selectedWorker) return

    // 检查是否有未归还物品
    const unreturnedItems = selectedWorker.borrowedItems?.filter(item => !item.returnTime) || []
    if (unreturnedItems.length > 0) {
      message.error(`该工人还有 ${unreturnedItems.length} 件物品未归还，请先归还物品`)
      return
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

    message.success('离场登记完成')
    setExitModalVisible(false)
    setCurrentView('main')
  }

  // 4. 报表功能
  const handleReports = () => {
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
    message.success('已退出登录')
  }

  // 用户中心相关处理函数
  const handleUserCenterClick = () => {
    setUserCenterModalVisible(true)
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

  // 计算统计数据
  const currentOnSite = workers.filter(w => w.status === 'in').length
  const totalEnteredToday = attendanceRecords.filter(r => 
    dayjs(r.entryTime).isSame(dayjs(), 'day')
  ).length
  const totalExitedToday = attendanceRecords.filter(r => 
    r.exitTime && dayjs(r.exitTime).isSame(dayjs(), 'day')
  ).length
  const pendingExit = workers.filter(w => w.status === 'in').length

  // Header组件
  const renderHeader = () => (
    <Header style={{ 
      background: '#fff', 
      padding: '0 24px', 
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <Title level={2} style={{ margin: 0, color: '#1890ff', fontSize: '24px' }}>
          {user?.siteName || '工地管理系统'}
        </Title>
        <Text type="secondary" style={{ fontSize: '18px', fontWeight: 'bold' }}>
          <ClockCircleOutlined /> {currentTime}
        </Text>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Dropdown
          menu={{
            items: [
              {
                key: 'userCenter',
                label: '修改密码',
                icon: <UserOutlined />,
                onClick: handleUserCenterClick
              },
              {
                key: 'logout',
                label: '退出登录',
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
            gap: '12px',
            cursor: 'pointer',
            padding: '8px 12px',
            borderRadius: '6px',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Avatar icon={<UserOutlined />} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Text 
                strong 
                style={{ 
                  color: '#1890ff',
                  fontSize: '16px'
                }}
              >
                {user?.username || '门卫'}
              </Text>
              <Text type="secondary" style={{ fontSize: '14px' }}>
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
      { key: 'entry', label: '入场登记', icon: <UserAddOutlined />, color: '#1890ff', onClick: handleEntryRegistration },
      { key: 'borrow', label: '借物登记', icon: <ShoppingCartOutlined />, color: '#52c41a', onClick: handleItemBorrowing },
      { key: 'exit', label: '离场登记', icon: <LogoutOutlined />, color: '#fa541c', onClick: handleExitProcess },
      { key: 'reports', label: '报表查看', icon: <BarChartOutlined />, color: '#722ed1', onClick: handleReports }
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
                color: button.color,
                borderColor: button.color,
                height: '36px'
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
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="当前在场人数"
                value={currentOnSite}
                prefix={<UserAddOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="今日入场人数"
                value={totalEnteredToday}
                prefix={<UserAddOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="今日离场人数"
                value={totalExitedToday}
                prefix={<LogoutOutlined />}
                valueStyle={{ color: '#fa541c' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="待离场人数"
                value={pendingExit}
                prefix={<LogoutOutlined />}
                valueStyle={{ color: '#fa541c' }}
              />
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
              <Title level={4}>入场登记</Title>
              <Text type="secondary">工人入场时进行登记</Text>
            </Card>
          </Col>
          <Col span={12}>
            <Card 
              hoverable
              style={{ textAlign: 'center', height: '200px' }}
              onClick={handleItemBorrowing}
            >
              <ShoppingCartOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: '16px' }} />
              <Title level={4}>借物登记</Title>
              <Text type="secondary">工人借用物品登记</Text>
            </Card>
          </Col>
          <Col span={12}>
            <Card 
              hoverable
              style={{ textAlign: 'center', height: '200px' }}
              onClick={handleExitProcess}
            >
              <LogoutOutlined style={{ fontSize: '48px', color: '#fa541c', marginBottom: '16px' }} />
              <Title level={4}>离场登记</Title>
              <Text type="secondary">工人离场时进行登记</Text>
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
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <Title level={2} style={{ margin: 0 }}>入场登记</Title>
            <Space wrap>
              {[
                { key: 'entry', label: '入场登记', icon: <UserAddOutlined />, color: '#1890ff', onClick: handleEntryRegistration },
                { key: 'borrow', label: '借物登记', icon: <ShoppingCartOutlined />, color: '#52c41a', onClick: handleItemBorrowing },
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
                    color: button.color,
                    borderColor: button.color,
                    height: '36px'
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
              <Text strong style={{ fontSize: 'clamp(18px, 3vw, 24px)' }}>1. 输入二维码编号：</Text>
              <Input
                placeholder="请输入工人ID（必填）"
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

  // 借物登记页面
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
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <Title level={2} style={{ margin: 0 }}>借物登记</Title>
            <Space wrap>
              {[
                { key: 'entry', label: '入场登记', icon: <UserAddOutlined />, color: '#1890ff', onClick: handleEntryRegistration },
                { key: 'borrow', label: '借物登记', icon: <ShoppingCartOutlined />, color: '#52c41a', onClick: handleItemBorrowing },
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
                    color: button.color,
                    borderColor: button.color,
                    height: '36px'
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
              <Text strong style={{ fontSize: 'clamp(18px, 3vw, 24px)' }}>1. 输入二维码编号：</Text>
              <Input
                placeholder="请输入工人ID（必填）"
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
                        <Text strong style={{ fontSize: 'clamp(18px, 3vw, 24px)', marginLeft: '8px' }}>{selectedWorker.idCard}</Text>
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 'clamp(16px, 2.5vw, 22px)' }}>实体卡号：</Text>
                        <Text strong style={{ fontSize: 'clamp(18px, 3vw, 24px)', marginLeft: '8px' }}>{selectedWorker.physicalCardId}</Text>
                      </div>
                    </Space>
                  </Card>
                </div>

                <div>
                  <Text strong style={{ fontSize: 'clamp(18px, 3vw, 24px)' }}>3. 物品类型：</Text>
                  <Select
                    placeholder="请选择物品类型（必填）"
                    value={selectedItemType}
                    onChange={setSelectedItemType}
                    style={{ marginTop: '8px', width: '100%', height: '48px' }}
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
                    style={{ marginTop: '8px', height: '48px', fontSize: 'clamp(16px, 2.5vw, 22px)' }}
                  />
                </div>

                <div>
                  <Text strong style={{ fontSize: 'clamp(18px, 3vw, 24px)' }}>5. 备注：</Text>
                  <Input.TextArea
                    placeholder="请输入备注信息（可选）"
                    value={borrowRemark}
                    onChange={(e) => setBorrowRemark(e.target.value)}
                    style={{ marginTop: '8px', fontSize: 'clamp(16px, 2.5vw, 22px)' }}
                    rows={3}
                  />
                </div>

                <Button 
                  type="primary" 
                  size="large"
                  onClick={handleCompleteBorrow}
                  style={{ width: '100%', height: '56px', fontSize: 'clamp(18px, 3vw, 24px)' }}
                >
                  完成借物登记
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
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <Title level={2} style={{ margin: 0 }}>离场登记</Title>
            <Space wrap>
              {[
                { key: 'entry', label: '入场登记', icon: <UserAddOutlined />, color: '#1890ff', onClick: handleEntryRegistration },
                { key: 'borrow', label: '借物登记', icon: <ShoppingCartOutlined />, color: '#52c41a', onClick: handleItemBorrowing },
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
                    color: button.color,
                    borderColor: button.color,
                    height: '36px'
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
              <Text strong style={{ fontSize: 'clamp(18px, 3vw, 24px)' }}>1. 输入二维码编号：</Text>
              <Input
                placeholder="请输入工人ID（必填）"
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
                        <Text strong style={{ fontSize: 'clamp(18px, 3vw, 24px)', marginLeft: '8px' }}>{selectedWorker.idCard}</Text>
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 'clamp(16px, 2.5vw, 22px)' }}>实体卡号：</Text>
                        <Text strong style={{ fontSize: 'clamp(18px, 3vw, 24px)', marginLeft: '8px' }}>{selectedWorker.physicalCardId}</Text>
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
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            padding: '8px',
                            border: '1px solid #f0f0f0',
                            borderRadius: '4px'
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
                  disabled={selectedWorker.borrowedItems?.some((item: any) => !item.returnTime)}
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
              display: 'inline-block',
              width: '24px',
              height: '24px',
              lineHeight: '24px',
              textAlign: 'center',
              backgroundColor: value > 0 ? '#1890ff' : '#f5f5f5',
              color: value > 0 ? '#fff' : '#999',
              borderRadius: '4px',
              cursor: value > 0 ? 'pointer' : 'default',
              fontSize: '12px',
              fontWeight: 'bold',
              border: value > 0 ? 'none' : '1px solid #d9d9d9'
            }}
            onClick={() => value > 0 && handleViewItemRecords(record)}
          >
            {value}
          </span>
        ),
      },
      {
        title: '已归还',
        dataIndex: 'returnedItems',
        key: 'returnedItems',
        width: 100,
        render: (value: number, record: AttendanceRecord) => (
          <span 
            style={{ 
              display: 'inline-block',
              width: '24px',
              height: '24px',
              lineHeight: '24px',
              textAlign: 'center',
              backgroundColor: value > 0 ? '#52c41a' : '#f5f5f5',
              color: value > 0 ? '#fff' : '#999',
              borderRadius: '4px',
              cursor: value > 0 ? 'pointer' : 'default',
              fontSize: '12px',
              fontWeight: 'bold',
              border: value > 0 ? 'none' : '1px solid #d9d9d9'
            }}
            onClick={() => value > 0 && handleViewItemRecords(record)}
          >
            {value}
          </span>
        ),
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
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <Title level={2} style={{ margin: 0 }}>今日访客记录</Title>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Space wrap>
                  {[
                    { key: 'entry', label: '入场登记', icon: <UserAddOutlined />, color: '#1890ff', onClick: handleEntryRegistration },
                    { key: 'borrow', label: '借物登记', icon: <ShoppingCartOutlined />, color: '#52c41a', onClick: handleItemBorrowing },
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
                        color: button.color,
                        borderColor: button.color,
                        height: '36px'
                      }}
                    >
                      {button.label}
                    </Button>
                  ))}
                </Space>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
              </div>
            </div>
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
              <Text type="secondary">
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
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
