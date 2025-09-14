import React, { useState, useMemo } from 'react'
import { Card, Table, Button, Space, Modal, Form, Input, Select, Tag, message, Row, Col, Upload, DatePicker, Pagination } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, DownloadOutlined, ExclamationCircleOutlined, CheckCircleOutlined, StopOutlined, QrcodeOutlined, MailOutlined, MessageOutlined } from '@ant-design/icons'
import { Worker } from '../types/worker'
import { mockWorkers } from '../data/mockData'
import { 
  exportWorkersToExcel, 
  readWorkerExcelFile,
  generateWorkerImportTemplate
} from '../utils/excelUtils'
import { useLocale } from '../contexts/LocaleContext'
import dayjs from 'dayjs'


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
  
  // 模拟当前登录的分判商信息
  const currentDistributor = {
    id: '1',
    name: '北京建筑公司',
    accountUsername: 'bjadmin'
  }

  // 工人管理状态
  const [workers, setWorkers] = useState<Worker[]>(mockWorkers.filter(w => w.distributorId === currentDistributor.id))
  const [workerModalOpen, setWorkerModalOpen] = useState(false)
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null)
  const [workerForm] = Form.useForm()
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [qrCodeModalOpen, setQrCodeModalOpen] = useState(false)
  const [selectedWorkerForQR, setSelectedWorkerForQR] = useState<Worker | null>(null)

  // 筛选状态
  const [statusFilters, setStatusFilters] = useState<string[]>([])
  const [keyword, setKeyword] = useState<string>('')
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // 筛选后的工人数据
  const filteredWorkers = useMemo(() => {
    return workers.filter(worker => {
      if (statusFilters.length > 0 && !statusFilters.includes(worker.status)) return false
      if (keyword.trim()) {
        const k = keyword.trim().toLowerCase()
        const text = `${worker.name || ''} ${worker.workerId || ''} ${worker.idCard || ''}`.toLowerCase()
        if (!text.includes(k)) return false
      }
      return true
    })
  }, [workers, statusFilters, keyword])

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

  // 工人表单提交
  const onWorkerSubmit = async () => {
    try {
      const values = await workerForm.validateFields()
      
      if (editingWorker) {
        // 编辑工人
        setWorkers(prev => prev.map(w => 
          w.id === editingWorker.id 
            ? { ...w, ...values, updatedAt: new Date().toISOString() }
            : w
        ))
        message.success(t('distributor.workerInfoUpdated'))
      } else {
        // 新增工人
        const newWorker: Worker = {
          id: Date.now().toString(),
          workerId: values.workerId,
          name: values.name,
          gender: values.gender,
          idCard: values.idCard,
          region: values.region,
          photo: '',
          distributorId: currentDistributor.id,
          siteId: values.siteId,
          phone: values.phone,
          email: values.email,
          whatsapp: values.whatsapp,
          birthDate: values.birthDate,
          age: values.age,
          // physicalCardId: values.physicalCardId, // 移除实体卡ID
          status: values.status || 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        setWorkers(prev => [newWorker, ...prev])
        message.success(t('distributor.workerInfoAdded'))
        
        // 显示二维码发送选项
        setSelectedWorkerForQR(newWorker)
        setQrCodeModalOpen(true)
      }
      
      setWorkerModalOpen(false)
      setEditingWorker(null)
      workerForm.resetFields()
    } catch (error) {
      console.error('表单验证失败:', error)
    }
  }

  // 删除工人
  const handleDeleteWorker = (worker: Worker) => {
    Modal.confirm({
      title: t('distributor.confirmDelete'),
      icon: <ExclamationCircleOutlined />,
      content: t('distributor.confirmDeleteContent').replace('{name}', worker.name),
      onOk: () => {
        setWorkers(prev => prev.filter(w => w.id !== worker.id))
        message.success(t('distributor.workerInfoDeleted'))
      }
    })
  }

  // 发送二维码
  const handleSendQRCode = (method: 'email' | 'whatsapp', worker?: Worker) => {
    const targetWorker = worker || selectedWorkerForQR
    if (!targetWorker) return

    if (method === 'email') {
      if (!targetWorker.email) {
        message.warning(t('distributor.noEmailWarning'))
        return
      }
      // 这里应该调用实际的邮件发送API，传入工人信息生成二维码
      console.log('发送邮件二维码到:', targetWorker.email, '工人信息:', {
        workerId: targetWorker.workerId,
        name: targetWorker.name,
        phone: targetWorker.phone
      })
      message.success(t('distributor.qrCodeSentToEmail').replace('{email}', targetWorker.email))
    } else if (method === 'whatsapp') {
      if (!targetWorker.whatsapp) {
        message.warning(t('distributor.noWhatsappWarning'))
        return
      }
      // 这里应该调用实际的WhatsApp发送API，传入工人信息生成二维码
      console.log('发送WhatsApp二维码到:', targetWorker.whatsapp, '工人信息:', {
        workerId: targetWorker.workerId,
        name: targetWorker.name,
        phone: targetWorker.phone
      })
      message.success(t('distributor.qrCodeSentToWhatsapp').replace('{whatsapp}', targetWorker.whatsapp))
    }

    setQrCodeModalOpen(false)
    setSelectedWorkerForQR(null)
  }

  // 批量发送二维码
  const handleBatchSendQRCode = (method: 'email' | 'whatsapp') => {
    if (selectedWorkerIds.length === 0) {
      message.warning(t('distributor.pleaseSelectWorkers'))
      return
    }

    const selectedWorkers = workers.filter(w => selectedWorkerIds.includes(w.id))
    const validWorkers = selectedWorkers.filter(w => 
      method === 'email' ? w.email : w.whatsapp
    )

    if (validWorkers.length === 0) {
      message.warning(method === 'email' ? t('distributor.noValidEmailWarning') : t('distributor.noValidWhatsappWarning'))
      return
    }

    // 这里应该调用实际的批量发送API
    message.success(t('distributor.qrCodeBatchSent').replace('{count}', validWorkers.length.toString()))
    setSelectedWorkerIds([])
  }


  // 切换工人状态
  const handleToggleStatus = (worker: Worker) => {
    const newStatus = worker.status === 'active' ? 'suspended' : 'active'
    setWorkers(prev => prev.map(w => 
      w.id === worker.id 
        ? { ...w, status: newStatus, updatedAt: new Date().toISOString() }
        : w
    ))
    message.success(t('distributor.workerStatusUpdated').replace('{status}', newStatus === 'active' ? t('distributor.active') : t('distributor.suspended')))
  }

  // 导出工人数据
  const handleExport = (exportAll: boolean = true) => {
    const dataToExport = exportAll ? workers : workers.filter(worker => selectedWorkerIds.includes(worker.id))
    if (!exportAll && selectedWorkerIds.length === 0) {
      message.warning(t('distributor.pleaseSelectWorkersToExport'))
      return
    }
    
    exportWorkersToExcel(dataToExport, [], [])
    message.success(t('distributor.exportedWorkers').replace('{count}', dataToExport.length.toString()))
  }

  // 下载模板
  const handleDownloadTemplate = () => {
    generateWorkerImportTemplate()
    message.success(t('distributor.templateDownloaded'))
  }

  // 导入工人数据
  const handleImport = (file: File) => {
    setLoading(true)
    readWorkerExcelFile(file)
      .then(({ workers: importedWorkers, errors }) => {
        if (errors.length > 0) {
          message.error(t('distributor.importFailed').replace('{errors}', errors.join(', ')))
        } else {
          // 过滤出属于当前分判商的工人并转换为Worker类型
          const validWorkers: Worker[] = importedWorkers
            .filter(w => w.distributorId === currentDistributor.id)
            .map(w => ({
              ...w,
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              photo: w.photo || '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }))
          setWorkers(prev => [...validWorkers, ...prev])
          message.success(t('distributor.importSuccess').replace('{count}', validWorkers.length.toString()))
        }
      })
      .catch(error => {
        message.error(t('distributor.importError').replace('{error}', error.message))
      })
      .finally(() => {
        setLoading(false)
      })
  }

  // 工人表格列定义
  const workerColumns = [
    { title: t('distributor.workerId'), dataIndex: 'workerId', key: 'workerId', width: 120, fixed: 'left' as const, ellipsis: true, sorter: (a: Worker, b: Worker) => a.workerId.localeCompare(b.workerId) },
    { title: t('distributor.name'), dataIndex: 'name', key: 'name', width: 100, fixed: 'left' as const, ellipsis: true, sorter: (a: Worker, b: Worker) => a.name.localeCompare(b.name) },
    { title: t('distributor.gender'), dataIndex: 'gender', key: 'gender', width: 80, render: (gender: string) => getGenderTag(gender), ellipsis: true, sorter: (a: Worker, b: Worker) => a.gender.localeCompare(b.gender) },
    { title: t('distributor.birthDate'), dataIndex: 'birthDate', key: 'birthDate', width: 120, render: (d?: string) => d || '-', ellipsis: true, sorter: (a: Worker, b: Worker) => (a.birthDate || '').localeCompare(b.birthDate || '') },
    { title: t('distributor.age'), dataIndex: 'age', key: 'age', width: 80, render: (age?: number) => (typeof age === 'number' ? age : '-'), ellipsis: true, sorter: (a: Worker, b: Worker) => (a.age || 0) - (b.age || 0) },
    { title: t('distributor.idCard'), dataIndex: 'idCard', key: 'idCard', width: 180, ellipsis: true, sorter: (a: Worker, b: Worker) => a.idCard.localeCompare(b.idCard) },
    { title: t('distributor.region'), dataIndex: 'region', key: 'region', width: 100, ellipsis: true, sorter: (a: Worker, b: Worker) => a.region.localeCompare(b.region) },
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
              birthDate: record.birthDate ? dayjs(record.birthDate) : undefined
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
      female: { color: 'pink', text: t('distributor.female') } 
    }
    const cfg = map[gender]
    return <Tag color={cfg.color}>{cfg.text}</Tag>
  }

  // 获取状态标签
  const getStatusTag = (status: string) => {
    const map: Record<string, { color: string; text: string }> = { 
      active: { color: 'green', text: t('distributor.active') }, 
      suspended: { color: 'orange', text: t('distributor.suspended') }, 
      inactive: { color: 'red', text: t('distributor.inactive') } 
    }
    const cfg = map[status]
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
                  { value: 'suspended', label: t('distributor.suspended') },
                  { value: 'inactive', label: t('distributor.inactive') }
                ]}
                allowClear
                maxTagCount="responsive"
                maxTagTextLength={2}
                dropdownStyle={{ maxHeight: 200, overflow: 'auto' }}
              />
            </div>
            
            {/* 操作按钮 */}
            <Space>
              <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
                {t('distributor.downloadTemplate')}
              </Button>
              <Upload
                accept=".xlsx,.xls"
                showUploadList={false}
                beforeUpload={(file) => {
                  handleImport(file)
                  return false
                }}
              >
                <Button icon={<UploadOutlined />} loading={loading}>
                  {t('distributor.excelImport')}
                </Button>
              </Upload>
              <Button 
                icon={<DownloadOutlined />} 
                onClick={() => handleExport(selectedWorkerIds.length === 0)}
              >
                {selectedWorkerIds.length === 0 ? t('distributor.exportAll') : `${t('distributor.exportSelected')}(${selectedWorkerIds.length})`}
              </Button>
              <Button 
                icon={<MailOutlined />} 
                onClick={() => handleBatchSendQRCode('email')}
                disabled={selectedWorkerIds.length === 0}
              >
                {t('distributor.batchSendEmail')}
              </Button>
              <Button 
                icon={<MessageOutlined />} 
                onClick={() => handleBatchSendQRCode('whatsapp')}
                disabled={selectedWorkerIds.length === 0}
              >
                {t('distributor.batchSendWhatsApp')}
              </Button>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={() => { 
                  setEditingWorker(null)
                  workerForm.resetFields()
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
              {t('distributor.selectedWorkers').replace('{count}', selectedWorkerIds.length.toString())}
              {selectedWorkerIds.length > 0 && (
                <span style={{ color: '#999', marginLeft: '8px' }}>
                  / {t('distributor.totalWorkers').replace('{count}', filteredWorkers.length.toString())}
                </span>
              )}
            </span>
            {selectedWorkerIds.length > 0 && (
              <Button 
                size="small" 
                onClick={() => setSelectedWorkerIds([])}
              >
                {t('distributor.clearSelection')}
              </Button>
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
              t('distributor.pageInfo').replace('{start}', range[0].toString()).replace('{end}', range[1].toString()).replace('{total}', total.toString())
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
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="workerId" label={t('distributor.workerId')} rules={[{ required: true, message: t('distributor.pleaseEnterWorkerId') }]}>
                <Input placeholder={t('distributor.workerIdPlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="name" label={t('distributor.name')} rules={[{ required: true, message: t('distributor.pleaseEnterName') }]}>
                <Input placeholder={t('distributor.namePlaceholder')} />
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
              <Form.Item name="idCard" label={t('distributor.idCard')} rules={[{ required: true, message: t('distributor.pleaseEnterIdCard') }]}>
                <Input placeholder={t('distributor.idCardPlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="region" label={t('distributor.region')} rules={[{ required: true, message: t('distributor.pleaseSelectRegion') }]}>
                <Select placeholder={t('distributor.regionPlaceholder')} options={[
                  { value: '中国大陆', label: t('distributor.chinaMainland') },
                  { value: '中国香港', label: t('distributor.chinaHongkong') },
                  { value: '中国澳门', label: t('distributor.chinaMacau') },
                  { value: '中国台湾', label: t('distributor.chinaTaiwan') }
                ]} />
              </Form.Item>
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
              {/* 预留位置，保持布局平衡 */}
            </Col>
          </Row>

          <Form.Item name="status" label={t('distributor.status')} initialValue="active">
            <Select options={[
              { value: 'active', label: t('distributor.active') },
              { value: 'suspended', label: t('distributor.suspended') },
              { value: 'inactive', label: t('distributor.inactive') }
            ]} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 二维码发送模态框 */}
      <Modal
        title={t('distributor.sendQRCodeTitle')}
        open={qrCodeModalOpen}
        onCancel={() => {
          setQrCodeModalOpen(false)
          setSelectedWorkerForQR(null)
        }}
        footer={null}
        width={500}
      >
        {selectedWorkerForQR && (
          <div>
            <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
              <div><strong>{t('distributor.workerName')}</strong>{selectedWorkerForQR.name}</div>
              <div><strong>{t('distributor.workerIdLabel')}</strong>{selectedWorkerForQR.workerId}</div>
              <div><strong>{t('distributor.phoneLabel')}</strong>{selectedWorkerForQR.phone}</div>
              {selectedWorkerForQR.email && <div><strong>{t('distributor.emailLabel')}</strong>{selectedWorkerForQR.email}</div>}
              {selectedWorkerForQR.whatsapp && <div><strong>{t('distributor.whatsappLabel')}</strong>{selectedWorkerForQR.whatsapp}</div>}
            </div>
            
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: 16 }}>
                {t('distributor.selectSendMethod')}
              </div>
              <Space size="large">
                <Button 
                  type="primary" 
                  icon={<MailOutlined />} 
                  size="large"
                  onClick={() => handleSendQRCode('email')}
                  disabled={!selectedWorkerForQR.email}
                >
                  {t('distributor.sendEmail')}
                </Button>
                <Button 
                  type="primary" 
                  icon={<MessageOutlined />} 
                  size="large"
                  onClick={() => handleSendQRCode('whatsapp')}
                  disabled={!selectedWorkerForQR.whatsapp}
                >
                  {t('distributor.sendWhatsapp')}
                </Button>
              </Space>
            </div>
            
            {(!selectedWorkerForQR.email && !selectedWorkerForQR.whatsapp) && (
              <div style={{ textAlign: 'center', color: '#999', fontSize: '14px' }}>
                {t('distributor.noContactInfo')}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default DistributorWorkerUpload
