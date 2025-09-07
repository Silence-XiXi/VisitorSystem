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
import dayjs from 'dayjs'


// 添加样式来修复表格固定列的问题
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
  .distributor-worker-table .ant-table-thead > tr > th {
    z-index: 1 !important;
    position: relative;
  }
  .distributor-worker-table .ant-table-thead {
    z-index: 1 !important;
  }
  .ant-table {
    z-index: 1 !important;
  }
  .ant-table-container {
    z-index: 1 !important;
  }
  .ant-table-body {
    z-index: 1 !important;
  }
  .ant-table-tbody {
    z-index: 1 !important;
  }
  .ant-table-tbody > tr > td {
    z-index: 1 !important;
  }
`

const DistributorWorkerUpload: React.FC = () => {
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
        message.success('工人信息已更新')
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
        message.success('工人信息已添加')
        
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
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除工人「${worker.name}」吗？`,
      onOk: () => {
        setWorkers(prev => prev.filter(w => w.id !== worker.id))
        message.success('工人信息已删除')
      }
    })
  }

  // 发送二维码
  const handleSendQRCode = (method: 'email' | 'whatsapp', worker?: Worker) => {
    const targetWorker = worker || selectedWorkerForQR
    if (!targetWorker) return

    if (method === 'email') {
      if (!targetWorker.email) {
        message.warning('该工人没有邮箱地址，无法发送邮件')
        return
      }
      // 这里应该调用实际的邮件发送API，传入工人信息生成二维码
      console.log('发送邮件二维码到:', targetWorker.email, '工人信息:', {
        workerId: targetWorker.workerId,
        name: targetWorker.name,
        phone: targetWorker.phone
      })
      message.success(`二维码已发送到 ${targetWorker.email}`)
    } else if (method === 'whatsapp') {
      if (!targetWorker.whatsapp) {
        message.warning('该工人没有WhatsApp号码，无法发送消息')
        return
      }
      // 这里应该调用实际的WhatsApp发送API，传入工人信息生成二维码
      console.log('发送WhatsApp二维码到:', targetWorker.whatsapp, '工人信息:', {
        workerId: targetWorker.workerId,
        name: targetWorker.name,
        phone: targetWorker.phone
      })
      message.success(`二维码已发送到 ${targetWorker.whatsapp}`)
    }

    setQrCodeModalOpen(false)
    setSelectedWorkerForQR(null)
  }

  // 批量发送二维码
  const handleBatchSendQRCode = (method: 'email' | 'whatsapp') => {
    if (selectedWorkerIds.length === 0) {
      message.warning('请先选择要发送二维码的工人')
      return
    }

    const selectedWorkers = workers.filter(w => selectedWorkerIds.includes(w.id))
    const validWorkers = selectedWorkers.filter(w => 
      method === 'email' ? w.email : w.whatsapp
    )

    if (validWorkers.length === 0) {
      message.warning(`选中的工人中没有有效的${method === 'email' ? '邮箱地址' : 'WhatsApp号码'}`)
      return
    }

    // 这里应该调用实际的批量发送API
    message.success(`二维码已批量发送给 ${validWorkers.length} 名工人`)
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
    message.success(`工人状态已更新为${newStatus === 'active' ? '在职' : '暂停'}`)
  }

  // 导出工人数据
  const handleExport = (exportAll: boolean = true) => {
    const dataToExport = exportAll ? workers : workers.filter(worker => selectedWorkerIds.includes(worker.id))
    if (!exportAll && selectedWorkerIds.length === 0) {
      message.warning('请先选择要导出的工人')
      return
    }
    
    exportWorkersToExcel(dataToExport, [], [])
    message.success(`已导出 ${dataToExport.length} 条工人信息`)
  }

  // 下载模板
  const handleDownloadTemplate = () => {
    generateWorkerImportTemplate()
    message.success('工人信息导入模板已下载')
  }

  // 导入工人数据
  const handleImport = (file: File) => {
    setLoading(true)
    readWorkerExcelFile(file)
      .then(({ workers: importedWorkers, errors }) => {
        if (errors.length > 0) {
          message.error(`导入失败：${errors.join(', ')}`)
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
          message.success(`成功导入 ${validWorkers.length} 条工人信息`)
        }
      })
      .catch(error => {
        message.error('导入失败：' + error.message)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  // 工人表格列定义
  const workerColumns = [
    { title: '工号', dataIndex: 'workerId', key: 'workerId', width: 120, fixed: 'left' as const, ellipsis: true, sorter: (a: Worker, b: Worker) => a.workerId.localeCompare(b.workerId) },
    { title: '姓名', dataIndex: 'name', key: 'name', width: 100, fixed: 'left' as const, ellipsis: true, sorter: (a: Worker, b: Worker) => a.name.localeCompare(b.name) },
    { title: '性别', dataIndex: 'gender', key: 'gender', width: 80, render: (gender: string) => getGenderTag(gender), ellipsis: true, sorter: (a: Worker, b: Worker) => a.gender.localeCompare(b.gender) },
    { title: '出生日期', dataIndex: 'birthDate', key: 'birthDate', width: 120, render: (d?: string) => d || '-', ellipsis: true, sorter: (a: Worker, b: Worker) => (a.birthDate || '').localeCompare(b.birthDate || '') },
    { title: '年龄', dataIndex: 'age', key: 'age', width: 80, render: (age?: number) => (typeof age === 'number' ? age : '-'), ellipsis: true, sorter: (a: Worker, b: Worker) => (a.age || 0) - (b.age || 0) },
    { title: '身份证号', dataIndex: 'idCard', key: 'idCard', width: 180, ellipsis: true, sorter: (a: Worker, b: Worker) => a.idCard.localeCompare(b.idCard) },
    { title: '地区', dataIndex: 'region', key: 'region', width: 100, ellipsis: true, sorter: (a: Worker, b: Worker) => a.region.localeCompare(b.region) },
    { title: '联系电话', dataIndex: 'phone', key: 'phone', width: 130, ellipsis: true, sorter: (a: Worker, b: Worker) => a.phone.localeCompare(b.phone) },
    { title: '邮箱', dataIndex: 'email', key: 'email', width: 180, ellipsis: true, sorter: (a: Worker, b: Worker) => a.email.localeCompare(b.email) },
    { title: 'WhatsApp', dataIndex: 'whatsapp', key: 'whatsapp', width: 130, render: (whatsapp: string) => {
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
    { title: '状态', dataIndex: 'status', key: 'status', width: 100, render: (status: string) => getStatusTag(status), ellipsis: true, sorter: (a: Worker, b: Worker) => a.status.localeCompare(b.status) },
    { title: '操作', key: 'actions', width: 150, fixed: 'right' as const, ellipsis: true, render: (_: unknown, record: Worker) => (
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
          title="编辑"
        />
        <Button 
          size="small" 
          icon={<QrcodeOutlined />} 
          onClick={() => {
            setSelectedWorkerForQR(record)
            setQrCodeModalOpen(true)
          }}
          title="发送二维码"
        />
        <Button 
          size="small" 
          icon={record.status === 'active' ? <StopOutlined /> : <CheckCircleOutlined />} 
          onClick={() => handleToggleStatus(record)}
          title={record.status === 'active' ? '暂停' : '启用'}
        />
        <Button 
          size="small" 
          danger 
          icon={<DeleteOutlined />} 
          onClick={() => handleDeleteWorker(record)}
          title="删除"
        />
      </Space>
    ) }
  ]

  // 获取性别标签
  const getGenderTag = (gender: string) => {
    const map: Record<string, { color: string; text: string }> = { 
      male: { color: 'blue', text: '男' }, 
      female: { color: 'pink', text: '女' } 
    }
    const cfg = map[gender]
    return <Tag color={cfg.color}>{cfg.text}</Tag>
  }

  // 获取状态标签
  const getStatusTag = (status: string) => {
    const map: Record<string, { color: string; text: string }> = { 
      active: { color: 'green', text: '在职' }, 
      suspended: { color: 'orange', text: '暂停' }, 
      inactive: { color: 'red', text: '离职' } 
    }
    const cfg = map[status]
    return <Tag color={cfg.color}>{cfg.text}</Tag>
  }

  // 行选择配置
  const rowSelection = {
    selectedRowKeys: selectedWorkerIds,
    onChange: (selectedRowKeys: React.Key[]) => {
      setSelectedWorkerIds(selectedRowKeys as string[])
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
        title={`工人信息管理 (${workers.length})`}
        extra={
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {/* 筛选器 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Input.Search
                placeholder="搜索工人姓名、工号或身份证号"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                allowClear
                style={{ width: 200 }}
              />
              <Select
                mode="multiple"
                style={{ width: 120 }}
                placeholder="状态筛选"
                value={statusFilters}
                onChange={setStatusFilters}
                options={[
                  { value: 'active', label: '在职' },
                  { value: 'suspended', label: '暂停' },
                  { value: 'inactive', label: '离职' }
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
                下载模板
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
                  Excel导入
                </Button>
              </Upload>
              <Button 
                icon={<DownloadOutlined />} 
                onClick={() => handleExport(selectedWorkerIds.length === 0)}
              >
                {selectedWorkerIds.length === 0 ? '导出全部' : `导出已选(${selectedWorkerIds.length})`}
              </Button>
              <Button 
                icon={<MailOutlined />} 
                onClick={() => handleBatchSendQRCode('email')}
                disabled={selectedWorkerIds.length === 0}
              >
                批量发送邮件
              </Button>
              <Button 
                icon={<MessageOutlined />} 
                onClick={() => handleBatchSendQRCode('whatsapp')}
                disabled={selectedWorkerIds.length === 0}
              >
                批量发送WhatsApp
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
                新增工人
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
        bodyStyle={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          padding: 0, 
          overflow: 'hidden',
          margin: 0
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
            className="distributor-worker-table"
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
            {selectedWorkerIds.length > 0 && (
              <>
                <span style={{ color: '#666', fontSize: '14px' }}>
                  已选择 <strong style={{ color: '#1890ff' }}>{selectedWorkerIds.length}</strong> 个工人
                </span>
                <Button 
                  size="small" 
                  onClick={() => setSelectedWorkerIds([])}
                >
                  清除选择
                </Button>
              </>
            )}
          </div>
          
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={filteredWorkers.length}
            showSizeChanger
            showQuickJumper
            showTotal={(total, range) => 
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`
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
        title={editingWorker ? '编辑工人信息' : '新增工人信息'}
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
              <Form.Item name="workerId" label="工号" rules={[{ required: true, message: '请输入工号' }]}>
                <Input placeholder="例如：WK001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
                <Input placeholder="工人姓名" />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="gender" label="性别" rules={[{ required: true, message: '请选择性别' }]}>
                <Select placeholder="请选择性别" options={[{ value: 'male', label: '男' }, { value: 'female', label: '女' }]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="birthDate" label="出生日期">
                <DatePicker style={{ width: '100%' }} placeholder="选择出生日期" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="idCard" label="身份证号" rules={[{ required: true, message: '请输入身份证号' }]}>
                <Input placeholder="身份证号码" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="region" label="地区" rules={[{ required: true, message: '请选择地区' }]}>
                <Select placeholder="请选择地区" options={[
                  { value: '中国大陆', label: '中国大陆' },
                  { value: '中国香港', label: '中国香港' },
                  { value: '中国澳门', label: '中国澳门' },
                  { value: '中国台湾', label: '中国台湾' }
                ]} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phone" label="联系电话" rules={[{ required: true, message: '请输入联系电话' }]}>
                <Input placeholder="手机号码" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="邮箱">
                <Input placeholder="邮箱地址" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="whatsapp" label="WhatsApp">
                <Input placeholder="例如：+86 13800138001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              {/* 预留位置，保持布局平衡 */}
            </Col>
          </Row>

          <Form.Item name="status" label="状态" initialValue="active">
            <Select options={[
              { value: 'active', label: '在职' },
              { value: 'suspended', label: '暂停' },
              { value: 'inactive', label: '离职' }
            ]} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 二维码发送模态框 */}
      <Modal
        title="发送二维码"
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
              <div><strong>工人姓名：</strong>{selectedWorkerForQR.name}</div>
              <div><strong>工号：</strong>{selectedWorkerForQR.workerId}</div>
              <div><strong>联系电话：</strong>{selectedWorkerForQR.phone}</div>
              {selectedWorkerForQR.email && <div><strong>邮箱：</strong>{selectedWorkerForQR.email}</div>}
              {selectedWorkerForQR.whatsapp && <div><strong>WhatsApp：</strong>{selectedWorkerForQR.whatsapp}</div>}
            </div>
            
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: 16 }}>
                选择发送方式
              </div>
              <Space size="large">
                <Button 
                  type="primary" 
                  icon={<MailOutlined />} 
                  size="large"
                  onClick={() => handleSendQRCode('email')}
                  disabled={!selectedWorkerForQR.email}
                >
                  发送邮件
                </Button>
                <Button 
                  type="primary" 
                  icon={<MessageOutlined />} 
                  size="large"
                  onClick={() => handleSendQRCode('whatsapp')}
                  disabled={!selectedWorkerForQR.whatsapp}
                >
                  发送WhatsApp
                </Button>
              </Space>
            </div>
            
            {(!selectedWorkerForQR.email && !selectedWorkerForQR.whatsapp) && (
              <div style={{ textAlign: 'center', color: '#999', fontSize: '14px' }}>
                该工人没有邮箱或WhatsApp信息，无法发送二维码
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default DistributorWorkerUpload
