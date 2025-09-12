import React, { useState, useEffect } from 'react'
import { Card, Table, Button, Space, Modal, Form, Input, Tag, message, Row, Col, Upload } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined, UploadOutlined, DownloadOutlined, StopOutlined, PlayCircleOutlined } from '@ant-design/icons'
import { useLocale } from '../contexts/LocaleContext'
import { apiService } from '../services/api'

// 借用物品分类接口
interface ItemCategory {
  id: string
  name: string
  description: string
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
  updatedAt: string
}

const ItemCategoryManagement: React.FC = () => {
  const { t } = useLocale()
  const [categories, setCategories] = useState<ItemCategory[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ItemCategory | null>(null)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()

  // 加载分类数据
  const loadCategories = async () => {
    try {
      setLoading(true)
      const data = await apiService.getAllItemCategories()
      setCategories(data)
    } catch (error) {
      console.error('加载分类数据失败:', error)
      message.error('加载分类数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

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
      onOk: async () => {
        try {
          await apiService.deleteItemCategory(record.id)
          setCategories(prev => prev.filter(c => c.id !== record.id))
          message.success(t('itemCategory.deleteSuccess').replace('{name}', record.name))
        } catch (error: any) {
          console.error('删除分类失败:', error)
          const errorMessage = error?.response?.data?.message || '删除分类失败'
          message.error(errorMessage)
        }
      }
    })
  }

  // 切换分类状态
  const handleToggleStatus = (record: ItemCategory) => {
    const newStatus = record.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    const statusTitle = newStatus === 'ACTIVE' ? t('itemCategory.enableTitle') : t('itemCategory.disableTitle')
    const statusContent = newStatus === 'ACTIVE' ? t('itemCategory.enableContent') : t('itemCategory.disableContent')
    const statusSuccess = newStatus === 'ACTIVE' ? t('itemCategory.enableSuccess') : t('itemCategory.disableSuccess')
    
    Modal.confirm({
      title: statusTitle,
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>{statusContent.replace('{name}', record.name)}</p>
          {newStatus === 'INACTIVE' && (
            <p style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '8px' }}>
              {t('itemCategory.disableWarning')}
            </p>
          )}
        </div>
      ),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okType: newStatus === 'INACTIVE' ? 'danger' : 'primary',
      onOk: async () => {
        try {
          setLoading(true)
          const updatedCategory = await apiService.toggleItemCategoryStatus(record.id)
          setCategories(prev => prev.map(c => c.id === record.id ? updatedCategory : c))
          message.success(statusSuccess.replace('{name}', record.name))
        } catch (error: any) {
          console.error('切换状态失败:', error)
          let errorMessage = '切换状态失败'
          
          if (error?.response?.data?.message) {
            errorMessage = error.response.data.message
          } else if (error?.message) {
            errorMessage = error.message
          }
          
          message.error(errorMessage)
        } finally {
          setLoading(false)
        }
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
        const map: Record<string, { color: string; text: string }> = { 
          ACTIVE: { color: 'green', text: t('itemCategory.active') }, 
          INACTIVE: { color: 'red', text: t('itemCategory.inactive') } 
        }
        const cfg = map[status] || map['ACTIVE']
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      } 
    },
    { title: t('itemCategory.createTime'), dataIndex: 'createdAt', key: 'createdAt', width: 180, render: (time: string) => new Date(time).toLocaleString() },
    { title: t('itemCategory.updateTime'), dataIndex: 'updatedAt', key: 'updatedAt', width: 180, render: (time: string) => new Date(time).toLocaleString() },
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
            icon={record.status === 'ACTIVE' ? <StopOutlined /> : <PlayCircleOutlined />}
            type={record.status === 'ACTIVE' ? 'default' : 'primary'}
            onClick={() => handleToggleStatus(record)}
            title={record.status === 'ACTIVE' ? t('itemCategory.disable') : t('itemCategory.enable')}
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
    try {
      const values = await form.validateFields()
      
      if (editingCategory) {
        // 编辑现有分类
        const updatedCategory = await apiService.updateItemCategory(editingCategory.id, {
          name: values.name,
          description: values.description,
          status: values.status || 'ACTIVE'
        })
        setCategories(prev => prev.map(c => c.id === editingCategory.id ? updatedCategory : c))
        message.success(t('itemCategory.updateSuccess'))
      } else {
        // 新增分类
        const newCategory = await apiService.createItemCategory({
          name: values.name,
          description: values.description,
          status: values.status || 'ACTIVE'
        })
        setCategories(prev => [newCategory, ...prev])
        message.success(t('itemCategory.addSuccess'))
      }
      
      setModalOpen(false)
      setEditingCategory(null)
      form.resetFields()
    } catch (error: any) {
      console.error('提交失败:', error)
      const errorMessage = error?.response?.data?.message || '操作失败'
      message.error(errorMessage)
    }
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
          loading={loading}
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
            initialValue={'ACTIVE'}
          >
            <Input.Group compact>
              <Button 
                style={{ width: '50%' }}
                onClick={() => form.setFieldValue('status', 'ACTIVE')}
                type={form.getFieldValue('status') === 'ACTIVE' ? 'primary' : 'default'}
              >
                {t('itemCategory.active')}
              </Button>
              <Button 
                style={{ width: '50%' }}
                onClick={() => form.setFieldValue('status', 'INACTIVE')}
                type={form.getFieldValue('status') === 'INACTIVE' ? 'primary' : 'default'}
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
