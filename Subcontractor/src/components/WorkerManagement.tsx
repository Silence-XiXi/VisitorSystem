import React, { useState } from 'react'
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Space,
  Tag,
  Popconfirm,
  message,
  Row,
  Col,
  Card,
  Typography,
  Avatar
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  PhoneOutlined,
  IdcardOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

const { Search } = Input
const { Option } = Select
const { Title } = Typography

interface Worker {
  key: string
  id: string
  name: string
  phone: string
  idCard: string
  position: string
  status: 'active' | 'inactive' | 'on_leave'
  joinDate: string
  avatar?: string
}

const WorkerManagement: React.FC = () => {
  const [workers, setWorkers] = useState<Worker[]>([
    {
      key: '1',
      id: 'W001',
      name: '张三',
      phone: '13800138001',
      idCard: '310101199001011234',
      position: '电工',
      status: 'active',
      joinDate: '2024-01-15'
    },
    {
      key: '2',
      id: 'W002',
      name: '李四',
      phone: '13800138002',
      idCard: '310101199002021234',
      position: '木工',
      status: 'active',
      joinDate: '2024-01-20'
    },
    {
      key: '3',
      id: 'W003',
      name: '王五',
      phone: '13800138003',
      idCard: '310101199003031234',
      position: '钢筋工',
      status: 'on_leave',
      joinDate: '2024-02-01'
    },
    {
      key: '4',
      id: 'W004',
      name: '赵六',
      phone: '13800138004',
      idCard: '310101199004041234',
      position: '瓦工',
      status: 'active',
      joinDate: '2024-02-10'
    },
    {
      key: '5',
      id: 'W005',
      name: '钱七',
      phone: '13800138005',
      idCard: '310101199005051234',
      position: '架子工',
      status: 'inactive',
      joinDate: '2024-02-15'
    }
  ])

  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null)
  const [searchText, setSearchText] = useState('')
  const [form] = Form.useForm()

  const statusConfig = {
    active: { color: 'green', text: '在职' },
    inactive: { color: 'red', text: '离职' },
    on_leave: { color: 'orange', text: '请假' }
  }

  const columns: ColumnsType<Worker> = [
    {
      title: '头像',
      dataIndex: 'avatar',
      key: 'avatar',
      width: 60,
      render: (_, record) => (
        <Avatar icon={<UserOutlined />} src={record.avatar} />
      )
    },
    {
      title: '工号',
      dataIndex: 'id',
      key: 'id',
      width: 80
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
      render: (phone) => (
        <Space>
          <PhoneOutlined />
          {phone}
        </Space>
      )
    },
    {
      title: '身份证号',
      dataIndex: 'idCard',
      key: 'idCard',
      width: 180,
      render: (idCard) => (
        <Space>
          <IdcardOutlined />
          {idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2')}
        </Space>
      )
    },
    {
      title: '职位',
      dataIndex: 'position',
      key: 'position',
      width: 100
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status) => {
        const config = statusConfig[status as keyof typeof statusConfig]
        return <Tag color={config.color}>{config.text}</Tag>
      }
    },
    {
      title: '入职日期',
      dataIndex: 'joinDate',
      key: 'joinDate',
      width: 120
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个工人信息吗？"
            onConfirm={() => handleDelete(record.key)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  const filteredWorkers = workers.filter(worker =>
    worker.name.toLowerCase().includes(searchText.toLowerCase()) ||
    worker.id.toLowerCase().includes(searchText.toLowerCase()) ||
    worker.phone.includes(searchText)
  )

  const handleAdd = () => {
    setEditingWorker(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEdit = (worker: Worker) => {
    setEditingWorker(worker)
    form.setFieldsValue({
      ...worker,
      joinDate: dayjs(worker.joinDate)
    })
    setIsModalVisible(true)
  }

  const handleDelete = (key: string) => {
    setWorkers(workers.filter(worker => worker.key !== key))
    message.success('删除成功')
  }

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields()
      const workerData: Worker = {
        ...values,
        joinDate: values.joinDate.format('YYYY-MM-DD'),
        key: editingWorker ? editingWorker.key : Date.now().toString(),
        id: editingWorker ? editingWorker.id : `W${String(workers.length + 1).padStart(3, '0')}`
      }

      if (editingWorker) {
        setWorkers(workers.map(worker =>
          worker.key === editingWorker.key ? workerData : worker
        ))
        message.success('更新成功')
      } else {
        setWorkers([...workers, workerData])
        message.success('添加成功')
      }

      setIsModalVisible(false)
      form.resetFields()
    } catch (error) {
      console.error('表单验证失败:', error)
    }
  }

  const handleModalCancel = () => {
    setIsModalVisible(false)
    form.resetFields()
  }

  return (
    <div className="fade-in" style={{ width: '100%' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Title level={3}>工人信息管理</Title>
        <p style={{ color: '#666' }}>管理工地所有工人的基本信息和状态</p>
      </div>

      <Row gutter={24}>
        <Col xs={24} sm={8}>
          <Card 
            hoverable
            style={{ 
              textAlign: 'center',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%)',
              border: '1px solid #91d5ff'
            }}
          >
            <div style={{ padding: '16px 0' }}>
              <div style={{ 
                fontSize: 32, 
                fontWeight: 'bold', 
                color: '#1890ff',
                marginBottom: 8
              }}>
                {workers.length}
              </div>
              <div style={{ color: '#666', fontSize: 16 }}>总工人数</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card 
            hoverable
            style={{ 
              textAlign: 'center',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #f6ffed 0%, #f0fff0 100%)',
              border: '1px solid #b7eb8f'
            }}
          >
            <div style={{ padding: '16px 0' }}>
              <div style={{ 
                fontSize: 32, 
                fontWeight: 'bold', 
                color: '#52c41a',
                marginBottom: 8
              }}>
                {workers.filter(w => w.status === 'active').length}
              </div>
              <div style={{ color: '#666', fontSize: 16 }}>在职人数</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card 
            hoverable
            style={{ 
              textAlign: 'center',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #fffbe6 0%, #fffff0 100%)',
              border: '1px solid #ffe58f'
            }}
          >
            <div style={{ padding: '16px 0' }}>
              <div style={{ 
                fontSize: 32, 
                fontWeight: 'bold', 
                color: '#faad14',
                marginBottom: 8
              }}>
                {workers.filter(w => w.status === 'on_leave').length}
              </div>
              <div style={{ color: '#666', fontSize: 16 }}>请假人数</div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card style={{ borderRadius: '12px' }}>
        <Row justify="space-between" style={{ marginBottom: 16 }}>
          <Col>
            <Search
              placeholder="搜索工人姓名、工号或手机号"
              allowClear
              style={{ width: 300 }}
              onSearch={setSearchText}
              onChange={e => setSearchText(e.target.value)}
            />
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              添加工人
            </Button>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={filteredWorkers}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      <Modal
        title={editingWorker ? '编辑工人信息' : '添加工人'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="姓名"
                rules={[{ required: true, message: '请输入姓名' }]}
              >
                <Input placeholder="请输入姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="手机号"
                rules={[
                  { required: true, message: '请输入手机号' },
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' }
                ]}
              >
                <Input placeholder="请输入手机号" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="idCard"
                label="身份证号"
                rules={[
                  { required: true, message: '请输入身份证号' },
                  { len: 18, message: '身份证号必须为18位' }
                ]}
              >
                <Input placeholder="请输入身份证号" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="position"
                label="职位"
                rules={[{ required: true, message: '请选择职位' }]}
              >
                <Select placeholder="请选择职位">
                  <Option value="电工">电工</Option>
                  <Option value="木工">木工</Option>
                  <Option value="钢筋工">钢筋工</Option>
                  <Option value="瓦工">瓦工</Option>
                  <Option value="架子工">架子工</Option>
                  <Option value="焊工">焊工</Option>
                  <Option value="普工">普工</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="status"
                label="状态"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select placeholder="请选择状态">
                  <Option value="active">在职</Option>
                  <Option value="on_leave">请假</Option>
                  <Option value="inactive">离职</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="joinDate"
                label="入职日期"
                rules={[{ required: true, message: '请选择入职日期' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  placeholder="请选择入职日期"
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
      </Space>
    </div>
  )
}

export default WorkerManagement
