import React, { useState } from 'react'
import { Card, Table, Button, Space, Modal, Form, Input, Tag, message, Row, Col, Upload } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons'
import { mockItemCategories } from '../data/mockData'
import { useLocale } from '../contexts/LocaleContext'

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
  const { t } = useLocale()
  const [categories, setCategories] = useState<ItemCategory[]>(mockItemCategories as ItemCategory[])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ItemCategory | null>(null)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [form] = Form.useForm()

  // 显示确认删除对话框
  const showDeleteConfirm = (record: ItemCategory) => {
    Modal.confirm({
      title: t('itemCategory.deleteConfirmTitle'),
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>{t('itemCategory.deleteConfirmContent').replace('{name}', record.name)}</p>
          <p style={{ color: '#ff4d4f', fontSize: '12px' }}>
            {t('itemCategory.deleteWarning')}
          </p>
        </div>
      ),
      okText: t('itemCategory.deleteConfirm'),
      cancelText: t('common.cancel'),
      okType: 'danger',
      onOk: () => {
        setCategories(prev => prev.filter(c => c.id !== record.id))
        message.success(t('itemCategory.deleteSuccess').replace('{name}', record.name))
      }
    })
  }

  // 切换分类状态
  const handleToggleStatus = (record: ItemCategory) => {
    const newStatus = record.status === 'active' ? 'inactive' : 'active'
    const statusTitle = newStatus === 'active' ? t('itemCategory.enableTitle') : t('itemCategory.disableTitle')
    const statusContent = newStatus === 'active' ? t('itemCategory.enableContent') : t('itemCategory.disableContent')
    const statusSuccess = newStatus === 'active' ? t('itemCategory.enableSuccess') : t('itemCategory.disableSuccess')
    
    Modal.confirm({
      title: statusTitle,
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>{statusContent.replace('{name}', record.name)}</p>
        </div>
      ),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: () => {
        setCategories(prev => prev.map(c => c.id === record.id ? { ...c, status: newStatus, updateTime: new Date().toISOString() } : c))
        message.success(statusSuccess.replace('{name}', record.name))
      }
    })
  }

  // 表格列定义
  const columns = [
    { title: t('itemCategory.categoryId'), dataIndex: 'id', key: 'id', width: 100 },
    { title: t('itemCategory.categoryName'), dataIndex: 'name', key: 'name', width: 160 },
    { title: t('itemCategory.descriptionLabel'), dataIndex: 'description', key: 'description' },
    { 
      title: t('itemCategory.status'), 
      dataIndex: 'status', 
      key: 'status', 
      width: 100, 
      render: (status: string) => {
        const map: any = { 
          active: { color: 'green', text: t('itemCategory.active') }, 
          inactive: { color: 'red', text: t('itemCategory.inactive') } 
        }
        const cfg = map[status]
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      } 
    },
    { title: t('itemCategory.createTime'), dataIndex: 'createTime', key: 'createTime', width: 180, render: (time: string) => new Date(time).toLocaleString() },
    { title: t('itemCategory.updateTime'), dataIndex: 'updateTime', key: 'updateTime', width: 180, render: (time: string) => new Date(time).toLocaleString() },
    { 
      title: t('common.actions'), 
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
            title={t('common.edit')}
          />
          <Button 
            size="small" 
            icon={record.status === 'active' ? <DeleteOutlined /> : <EditOutlined />}
            type={record.status === 'active' ? 'default' : 'primary'}
            onClick={() => handleToggleStatus(record)}
            title={record.status === 'active' ? t('itemCategory.disable') : t('itemCategory.enable')}
          />
          <Button 
            danger 
            size="small" 
            icon={<DeleteOutlined />} 
            onClick={() => showDeleteConfirm(record)}
            title={t('common.delete')}
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
      message.success(t('itemCategory.updateSuccess'))
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
      message.success(t('itemCategory.addSuccess'))
    }
    setModalOpen(false)
    setEditingCategory(null)
    form.resetFields()
  }

  // 导出分类数据
  const handleExport = (exportAll: boolean = true) => {
    const dataToExport = exportAll ? categories : categories.filter(category => selectedCategoryIds.includes(category.id))
    
    if (!exportAll && selectedCategoryIds.length === 0) {
      message.warning(t('itemCategory.pleaseSelectCategoriesToExport'))
      return
    }
    
    // TODO: 实现实际的导出逻辑
    message.success(t('itemCategory.exportSuccess').replace('{count}', dataToExport.length.toString()))
  }

  // 下载导入模板
  const handleDownloadTemplate = () => {
    // TODO: 实现实际的模板下载逻辑
    message.success(t('itemCategory.templateDownloaded'))
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
          {t('itemCategory.title')}
        </h2>
        <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '14px' }}>
          {t('itemCategory.description').replace('{count}', categories.length.toString())}
        </p>
      </div>

      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Input placeholder={t('itemCategory.searchPlaceholder')} allowClear />
          </Col>
          <Col span={16}>
            <Space>
              <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
                {t('itemCategory.downloadTemplate')}
              </Button>
              <Upload accept=".xlsx,.xls" showUploadList={false}>
                <Button icon={<UploadOutlined />}>{t('itemCategory.importCategories')}</Button>
              </Upload>
              <Button 
                icon={<DownloadOutlined />} 
                onClick={() => handleExport(selectedCategoryIds.length === 0)}
              >
                {selectedCategoryIds.length === 0 ? t('itemCategory.exportAll') : t('itemCategory.exportSelected').replace('{count}', selectedCategoryIds.length.toString())}
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
                {t('itemCategory.addCategory')}
              </Button>
            </Space>
          </Col>
        </Row>

        {/* 选择状态显示 */}
        {selectedCategoryIds.length > 0 && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f5f5f5', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#666', fontSize: '14px' }}>
              {t('itemCategory.selectedCategories').replace('{count}', selectedCategoryIds.length.toString())}
            </span>
            <Button 
              size="small" 
              onClick={() => setSelectedCategoryIds([])}
            >
              {t('itemCategory.clearSelection').replace('{count}', selectedCategoryIds.length.toString())}
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
        title={editingCategory ? t('itemCategory.editCategory') : t('itemCategory.addCategory')} 
        open={modalOpen} 
        onCancel={handleCancel} 
        onOk={onFormSubmit} 
        destroyOnClose
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item 
            name="name" 
            label={t('itemCategory.categoryName')} 
            rules={[{ required: true, message: t('itemCategory.nameRequired') }]}
          >
            <Input placeholder={t('itemCategory.namePlaceholder')} />
          </Form.Item>
          <Form.Item 
            name="description" 
            label={t('itemCategory.descriptionLabel')}
          >
            <Input.TextArea 
              placeholder={t('itemCategory.descriptionPlaceholder')} 
              rows={3}
            />
          </Form.Item>
          <Form.Item 
            name="status" 
            label={t('itemCategory.status')} 
            initialValue={'active'}
          >
            <Input.Group compact>
              <Button 
                style={{ width: '50%' }}
                onClick={() => form.setFieldValue('status', 'active')}
                type={form.getFieldValue('status') === 'active' ? 'primary' : 'default'}
              >
                {t('itemCategory.active')}
              </Button>
              <Button 
                style={{ width: '50%' }}
                onClick={() => form.setFieldValue('status', 'inactive')}
                type={form.getFieldValue('status') === 'inactive' ? 'primary' : 'default'}
              >
                {t('itemCategory.inactive')}
              </Button>
            </Input.Group>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ItemCategoryManagement
