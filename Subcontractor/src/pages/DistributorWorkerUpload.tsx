import React, { useState, useMemo } from 'react'
import { Card, Table, Button, Space, Modal, Form, Input, Select, Tag, message, Row, Col, Upload, DatePicker, Typography } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, DownloadOutlined, ExclamationCircleOutlined, CheckCircleOutlined, StopOutlined } from '@ant-design/icons'
import { Worker } from '../types/worker'
import { mockWorkers } from '../data/mockData'
import { 
  exportWorkersToExcel, 
  readWorkerExcelFile,
  generateWorkerImportTemplate
} from '../utils/excelUtils'
import dayjs from 'dayjs'

const { Title } = Typography

// 添加样式来修复表格固定列的问题
const tableStyles = `
  .distributor-worker-table .ant-table-fixed-left,
  .distributor-worker-table .ant-table-fixed-right {
    z-index: 100 !important;
  }
  .distributor-worker-table .ant-table-fixed-left .ant-table-thead > tr > th,
  .distributor-worker-table .ant-table-fixed-right .ant-table-thead > tr > th {
    z-index: 100 !important;
  }
  .distributor-worker-table .ant-table-fixed-left .ant-table-tbody > tr > td,
  .distributor-worker-table .ant-table-fixed-right .ant-table-tbody > tr > td {
    z-index: 100 !important;
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

  // 筛选状态
  const [statusFilters, setStatusFilters] = useState<string[]>([])
  const [keyword, setKeyword] = useState<string>('')

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
    { title: '工号', dataIndex: 'workerId', key: 'workerId', width: 120, fixed: 'left' as const, ellipsis: true },
    { title: '姓名', dataIndex: 'name', key: 'name', width: 100, fixed: 'left' as const, ellipsis: true },
    { title: '性别', dataIndex: 'gender', key: 'gender', width: 80, render: (gender: string) => getGenderTag(gender), ellipsis: true },
    { title: '出生日期', dataIndex: 'birthDate', key: 'birthDate', width: 120, render: (d?: string) => d || '-', ellipsis: true },
    { title: '年龄', dataIndex: 'age', key: 'age', width: 80, render: (age?: number) => (typeof age === 'number' ? age : '-'), ellipsis: true },
    { title: '身份证号', dataIndex: 'idCard', key: 'idCard', width: 180, ellipsis: true },
    { title: '地区', dataIndex: 'region', key: 'region', width: 100, ellipsis: true },
    { title: '联系电话', dataIndex: 'phone', key: 'phone', width: 130, ellipsis: true },
    { title: '邮箱', dataIndex: 'email', key: 'email', width: 180, ellipsis: true },
    { title: 'WhatsApp', dataIndex: 'whatsapp', key: 'whatsapp', width: 130, render: (whatsapp: string) => {
      if (!whatsapp) return '-';
      const parts = whatsapp.split(' ');
      if (parts.length === 2) {
        return (
          <div style={{ lineHeight: '1.2' }}>
            <div style={{ color: '#666' }}>{parts[0]}</div>
            <div>{parts[1]}</div>
          </div>
        );
      }
      return whatsapp;
    }, ellipsis: true },
    { title: '状态', dataIndex: 'status', key: 'status', width: 100, render: (status: string) => getStatusTag(status), ellipsis: true },
    { title: '操作', key: 'actions', width: 200, fixed: 'right' as const, ellipsis: true, render: (_: unknown, record: Worker) => (
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
    <div style={{ padding: '4px 16px 16px 16px' }}>
      {/* 添加样式来修复表格固定列覆盖header的问题 */}
      <style>{tableStyles}</style>
      
      {/* 页面标题 */}
      <div style={{ marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>
          {currentDistributor.name} - 工人信息管理
        </Title>
        <p style={{ color: '#666', margin: '4px 0 0 0' }}>
          管理您下属的工人信息，包括添加、编辑、导入导出等功能
        </p>
      </div>

      {/* 工人管理表格 */}
      <Card 
        title={`工人信息管理 (${workers.length})`}
        extra={
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
        }
      >
        {/* 筛选器 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Input.Search
              placeholder="搜索工人姓名、工号或身份证号"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              allowClear
            />
          </Col>
          <Col span={6}>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="状态筛选"
              value={statusFilters}
              onChange={setStatusFilters}
              options={[
                { value: 'active', label: '在职' },
                { value: 'suspended', label: '暂停' },
                { value: 'inactive', label: '离职' }
              ]}
              allowClear
            />
          </Col>
          <Col span={12}>
            <Space wrap>
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
            </Space>
          </Col>
        </Row>

        {/* 选择状态显示 */}
        {selectedWorkerIds.length > 0 && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f5f5f5', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#666', fontSize: '14px' }}>
              已选择 <strong style={{ color: '#1890ff' }}>{selectedWorkerIds.length}</strong> 个工人
            </span>
            <Button 
              size="small" 
              onClick={() => setSelectedWorkerIds([])}
            >
              清除选择({selectedWorkerIds.length})
            </Button>
          </div>
        )}

        {/* 工人表格 */}
        <Table
          rowSelection={rowSelection}
          columns={workerColumns}
          dataSource={filteredWorkers}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1800 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
            pageSizeOptions: ['10', '20', '50', '100'],
            defaultPageSize: 20,
          }}
          style={{ 
            fontSize: '14px'
          }}
          className="distributor-worker-table"
        />
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
    </div>
  )
}

export default DistributorWorkerUpload
