import React, { useState } from 'react'
import { Card, Table, Button, Space, Modal, Form, Input, Tag, message, Row, Col, Upload } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons'
import { mockItemCategories } from '../data/mockData'

// 借用物品分类接口
interface ItemCategory {
  id: string
  name: string
  description: string
  status: 'active' | 'inactive'
  createTime: string
  updateTime: string
}

const ItemCategoryManagement: React.FC = () => {
  const [categories, setCategories] = useState<ItemCategory[]>(mockItemCategories)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ItemCategory | null>(null)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [form] = Form.useForm()

  // 显示确认删除对话框
  const showDeleteConfirm = (record: ItemCategory) => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>确定要删除物品分类「{record.name}」吗？</p>
          <p style={{ color: '#ff4d4f', fontSize: '12px' }}>
            删除后该分类下的所有借用记录将无法正常显示
          </p>
        </div>
      ),
      okText: '确定删除',
      cancelText: '取消',
      okType: 'danger',
      onOk: () => {
        setCategories(prev => prev.filter(c => c.id !== record.id))
        message.success(`物品分类「${record.name}」已删除`)
      }
    })
  }

  // 切换分类状态
  const handleToggleStatus = (record: ItemCategory) => {
    const newStatus = record.status === 'active' ? 'inactive' : 'active'
    const statusText = newStatus === 'active' ? '启用' : '停用'
    
    Modal.confirm({
      title: `${statusText}物品分类`,
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>确定要{statusText}物品分类「{record.name}」吗？</p>
        </div>
      ),
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        setCategories(prev => prev.map(c => c.id === record.id ? { ...c, status: newStatus, updateTime: new Date().toISOString() } : c))
        message.success(`物品分类「${record.name}」已${statusText}`)
      }
    })
  }

  // 表格列定义
  const columns = [
    { title: '分类ID', dataIndex: 'id', key: 'id', width: 100 },
    { title: '分类名称', dataIndex: 'name', key: 'name', width: 160 },
    { title: '描述', dataIndex: 'description', key: 'description' },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status', 
      width: 100, 
      render: (status: string) => {
        const map: any = { 
          active: { color: 'green', text: '启用' }, 
          inactive: { color: 'red', text: '停用' } 
        }
        const cfg = map[status]
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      } 
    },
    { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 180, render: (time: string) => new Date(time).toLocaleString() },
    { title: '更新时间', dataIndex: 'updateTime', key: 'updateTime', width: 180, render: (time: string) => new Date(time).toLocaleString() },
    { 
      title: '操作', 
      key: 'actions', 
      width: 200, 
      render: (_: any, record: ItemCategory) => (
        <Space>
          <Button 
            size="small" 
            icon={<EditOutlined />} 
            onClick={() => { 
              setEditingCategory(record)
              form.setFieldsValue(record)
              setModalOpen(true) 
            }}
            title="编辑"
          />
          <Button 
            size="small" 
            icon={record.status === 'active' ? <DeleteOutlined /> : <EditOutlined />}
            type={record.status === 'active' ? 'default' : 'primary'}
            onClick={() => handleToggleStatus(record)}
            title={record.status === 'active' ? '停用' : '启用'}
          />
          <Button 
            danger 
            size="small" 
            icon={<DeleteOutlined />} 
            onClick={() => showDeleteConfirm(record)}
            title="删除"
          />
        </Space>
      )
    }
  ]

  // 表单提交
  const onFormSubmit = async () => {
    const values = await form.validateFields()
    if (editingCategory) {
      // 编辑现有分类
      setCategories(prev => prev.map(c => c.id === editingCategory.id ? { 
        ...editingCategory, 
        ...values, 
        updateTime: new Date().toISOString() 
      } : c))
      message.success('物品分类已更新')
    } else {
      // 新增分类
      const newCategory: ItemCategory = {
        id: Date.now().toString(),
        name: values.name,
        description: values.description || '',
        status: values.status || 'active',
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      }
      setCategories(prev => [newCategory, ...prev])
      message.success('物品分类已新增')
    }
    setModalOpen(false)
    setEditingCategory(null)
    form.resetFields()
  }

  // 导出分类数据
  const handleExport = (exportAll: boolean = true) => {
    const dataToExport = exportAll ? categories : categories.filter(category => selectedCategoryIds.includes(category.id))
    
    if (!exportAll && selectedCategoryIds.length === 0) {
      message.warning('请先选择要导出的分类')
      return
    }
    
    // TODO: 实现实际的导出逻辑
    message.success(`已导出 ${dataToExport.length} 条分类信息`)
  }

  // 下载导入模板
  const handleDownloadTemplate = () => {
    // TODO: 实现实际的模板下载逻辑
    message.success('分类导入模板已下载')
  }

  // 取消操作
  const handleCancel = () => {
    setModalOpen(false)
    setEditingCategory(null)
    form.resetFields()
  }

  return (
    <div style={{ padding: 24 }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
          借用物品分类管理
        </h2>
        <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '14px' }}>
          管理物品分类信息，共 {categories.length} 个分类
        </p>
      </div>

      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Input placeholder="搜索分类名称或描述" allowClear />
          </Col>
          <Col span={16}>
            <Space>
              <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
                下载模板
              </Button>
              <Upload accept=".xlsx,.xls" showUploadList={false}>
                <Button icon={<UploadOutlined />}>导入分类</Button>
              </Upload>
              <Button 
                icon={<DownloadOutlined />} 
                onClick={() => handleExport(selectedCategoryIds.length === 0)}
              >
                {selectedCategoryIds.length === 0 ? '导出全部' : `导出已选(${selectedCategoryIds.length})`}
              </Button>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={() => { 
                  setEditingCategory(null)
                  form.resetFields()
                  setModalOpen(true) 
                }}
              >
                新增分类
              </Button>
            </Space>
          </Col>
        </Row>

        {/* 选择状态显示 */}
        {selectedCategoryIds.length > 0 && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f5f5f5', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#666', fontSize: '14px' }}>
              已选择 <strong style={{ color: '#1890ff' }}>{selectedCategoryIds.length}</strong> 个分类
            </span>
            <Button 
              size="small" 
              onClick={() => setSelectedCategoryIds([])}
            >
              清除选择({selectedCategoryIds.length})
            </Button>
          </div>
        )}

        <Table 
          rowKey="id" 
          columns={columns} 
          dataSource={categories} 
          pagination={{ pageSize: 10, showSizeChanger: true }}
          rowSelection={{
            selectedRowKeys: selectedCategoryIds,
            onChange: (selectedRowKeys) => setSelectedCategoryIds(selectedRowKeys as string[]),
            getCheckboxProps: (record) => ({
              name: record.name,
            }),
          }}
        />
      </Card>

      {/* 新增/编辑分类模态框 */}
      <Modal 
        title={editingCategory ? '编辑物品分类' : '新增物品分类'} 
        open={modalOpen} 
        onCancel={handleCancel} 
        onOk={onFormSubmit} 
        destroyOnClose
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item 
            name="name" 
            label="分类名称" 
            rules={[{ required: true, message: '请输入分类名称' }]}
          >
            <Input placeholder="例如：门禁卡、钥匙、梯子等" />
          </Form.Item>
          <Form.Item 
            name="description" 
            label="分类描述"
          >
            <Input.TextArea 
              placeholder="请输入分类的详细描述" 
              rows={3}
            />
          </Form.Item>
          <Form.Item 
            name="status" 
            label="状态" 
            initialValue={'active'}
          >
            <Input.Group compact>
              <Button 
                type="button" 
                style={{ width: '50%' }}
                onClick={() => form.setFieldValue('status', 'active')}
                type={form.getFieldValue('status') === 'active' ? 'primary' : 'default'}
              >
                启用
              </Button>
              <Button 
                type="button" 
                style={{ width: '50%' }}
                onClick={() => form.setFieldValue('status', 'inactive')}
                type={form.getFieldValue('status') === 'inactive' ? 'primary' : 'default'}
              >
                停用
              </Button>
            </Input.Group>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ItemCategoryManagement
