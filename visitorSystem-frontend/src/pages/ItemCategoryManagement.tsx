import React, { useState, useEffect } from 'react'
import { Card, Table, Button, Space, Modal, Form, Input, Tag, message, Row, Col, Upload, Select } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined, UploadOutlined, DownloadOutlined, StopOutlined, PlayCircleOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useLocale } from '../contexts/LocaleContext'
import { apiService } from '../services/api'
import * as XLSX from 'xlsx'

// 借用物品分类接口
interface ItemCategory {
  id: string
  code: string
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
  const [searchKeyword, setSearchKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

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

  // 过滤分类数据
  const filteredCategories = categories.filter(category => {
    // 搜索关键词过滤
    const matchesSearch = !searchKeyword.trim() || 
      category.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      category.description.toLowerCase().includes(searchKeyword.toLowerCase())
    
    // 状态过滤
    const matchesStatus = statusFilter === 'all' || category.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

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
    { title: t('itemCategory.categoryCode'), dataIndex: 'code', key: 'code', width: 100 },
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
        // 新增分类 - 不传递code字段，让后端自动生成
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
    const dataToExport = exportAll ? filteredCategories : filteredCategories.filter(category => selectedCategoryIds.includes(category.id))
    
    if (!exportAll && selectedCategoryIds.length === 0) {
      message.warning(t('itemCategory.pleaseSelectCategoriesToExport'))
      return
    }
    
    if (dataToExport.length === 0) {
      message.warning(t('itemCategory.noDataToExport'))
      return
    }
    
    try {
      // 准备导出数据
      const exportData = dataToExport.map(category => ({
        [t('itemCategory.categoryCode')]: category.code,
        [t('itemCategory.categoryName')]: category.name,
        [t('itemCategory.descriptionLabel')]: category.description,
        [t('itemCategory.status')]: category.status === 'ACTIVE' ? t('itemCategory.active') : t('itemCategory.inactive')
      }))
      
      // 创建工作簿
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.json_to_sheet(exportData)
      
      // 设置列宽
      const colWidths = [
        { wch: 15 }, // 分类编号
        { wch: 20 }, // 分类名称
        { wch: 30 }, // 描述
        { wch: 10 }  // 状态
      ]
      worksheet['!cols'] = colWidths
      
      // 添加工作表
      XLSX.utils.book_append_sheet(workbook, worksheet, t('itemCategory.title'))
      
      // 生成文件名并下载
      const fileName = `物品分类_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(workbook, fileName)
      
      message.success(t('itemCategory.exportSuccess').replace('{count}', dataToExport.length.toString()))
    } catch (error) {
      console.error('导出失败:', error)
      message.error(t('itemCategory.exportFailed'))
    }
  }

  // 下载导入模板
  const handleDownloadTemplate = () => {
    try {
      // 准备模板数据
      const templateData = [
        {
          [t('itemCategory.categoryCode')]: 'C1234567',
          [t('itemCategory.categoryName')]: '安全帽',
          [t('itemCategory.descriptionLabel')]: '用于保护头部安全的防护用品',
          [t('itemCategory.status')]: t('itemCategory.active')
        },
        {
          [t('itemCategory.categoryCode')]: 'C2345678',
          [t('itemCategory.categoryName')]: '防护手套',
          [t('itemCategory.descriptionLabel')]: '用于保护手部安全的防护用品',
          [t('itemCategory.status')]: t('itemCategory.active')
        },
        {
          [t('itemCategory.categoryCode')]: 'C3456789',
          [t('itemCategory.categoryName')]: '安全鞋',
          [t('itemCategory.descriptionLabel')]: '用于保护足部安全的防护用品',
          [t('itemCategory.status')]: t('itemCategory.active')
        }
      ]
      
      // 创建工作簿
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.json_to_sheet(templateData)
      
      // 设置列宽
      const colWidths = [
        { wch: 15 }, // 分类编号
        { wch: 20 }, // 分类名称
        { wch: 40 }, // 描述
        { wch: 10 }  // 状态
      ]
      worksheet['!cols'] = colWidths
      
      // 添加工作表
      XLSX.utils.book_append_sheet(workbook, worksheet, t('itemCategory.importTemplate'))
      
      // 生成文件名并下载
      const fileName = '物品分类导入模板.xlsx'
      XLSX.writeFile(workbook, fileName)
      
      message.success(t('itemCategory.templateDownloaded'))
    } catch (error) {
      console.error('模板下载失败:', error)
      message.error(t('itemCategory.templateDownloadFailed'))
    }
  }

  // 处理文件导入
  const handleImport = async (file: File) => {
    try {
      // 读取Excel文件
      const data = new Uint8Array(await file.arrayBuffer())
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      
      if (jsonData.length < 2) {
        message.error(t('itemCategory.importFileEmpty'))
        return
      }
      
      const headers = jsonData[0] as string[]
      const dataRows = jsonData.slice(1)
      
      // 解析导入数据
      const importedCategories: Record<string, unknown>[] = []
      const errors: string[] = []
      
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i] as any[]
        if (!row.some(cell => cell !== null && cell !== undefined && cell !== '')) {
          continue // 跳过空行
        }
        
        const rowData: any = {}
        headers.forEach((header, colIndex) => {
          if (header && row[colIndex] !== undefined) {
            rowData[header] = row[colIndex]
          }
        })
        
        // 验证必填字段
        if (!rowData[t('itemCategory.categoryName')]) {
          errors.push(`第${i + 2}行：${t('itemCategory.categoryName')}不能为空`)
          continue
        }
        
        importedCategories.push(rowData)
      }
      
      if (importedCategories.length === 0) {
        message.warning(t('itemCategory.noValidData'))
        return
      }
      
      // 显示导入确认对话框
      Modal.confirm({
        title: t('itemCategory.importConfirm'),
        content: (
          <div>
            <p>{t('itemCategory.importConfirmMessage').replace('{count}', importedCategories.length.toString())}</p>
            <p style={{ color: '#666', fontSize: '12px', marginTop: '8px' }}>
              {t('itemCategory.importRulesMessage')}
            </p>
            {errors.length > 0 && (
              <div style={{ 
                marginTop: '12px', 
                padding: '8px', 
                background: '#fff7e6', 
                border: '1px solid #ffd591', 
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                <div style={{ color: '#fa8c16', fontWeight: 'bold', marginBottom: '4px' }}>
                  ⚠️ {t('itemCategory.importWarnings')}:
                </div>
                {errors.slice(0, 3).map((error, index) => (
                  <div key={index} style={{ color: '#666', marginBottom: '2px' }}>
                    {error}
                  </div>
                ))}
                {errors.length > 3 && (
                  <div style={{ color: '#999', fontStyle: 'italic' }}>
                    ... 还有 {errors.length - 3} 个警告
                  </div>
                )}
              </div>
            )}
          </div>
        ),
        onOk: async () => {
          await processItemCategoryImport(importedCategories)
        }
      })
    } catch (error) {
      console.error('导入失败:', error)
      message.error(t('itemCategory.importFailed'))
    }
  }

  // 处理物品分类导入
  const processItemCategoryImport = async (importedCategories: Record<string, unknown>[]) => {
    try {
      setLoading(true)
      
      let successCount = 0
      let skipCount = 0
      const errors: string[] = []
      
      for (const categoryData of importedCategories) {
        try {
          // 准备导入数据
          const importData = {
            code: String(categoryData[t('itemCategory.categoryCode')] || '').trim() || undefined,
            name: String(categoryData[t('itemCategory.categoryName')] || '').trim(),
            description: String(categoryData[t('itemCategory.descriptionLabel')] || '').trim(),
            status: categoryData[t('itemCategory.status')] === t('itemCategory.inactive') ? 'INACTIVE' : 'ACTIVE'
          }
          
          // 检查是否已存在相同名称的分类
          const existingCategory = categories.find(c => c.name === importData.name)
          if (existingCategory) {
            skipCount++
            continue
          }
          
          // 如果提供了code，检查是否已存在相同编号的分类
          if (importData.code) {
            const existingCode = categories.find(c => c.code === importData.code)
            if (existingCode) {
              skipCount++
              continue
            }
          }
          
          // 创建分类
          const newCategory = await apiService.createItemCategory(importData)
          setCategories(prev => [newCategory, ...prev])
          successCount++
          
        } catch (error: any) {
          const errorMessage = error?.response?.data?.message || '创建失败'
          errors.push(`${categoryData[t('itemCategory.categoryName')]}: ${errorMessage}`)
        }
      }
      
      // 显示导入结果弹窗
      showImportResultModal(successCount, skipCount, errors, 'itemCategory')
    } catch (error) {
      console.error('Import processing failed:', error)
      message.error(t('itemCategory.importFailed'))
    } finally {
      setLoading(false)
    }
  }

  // 显示导入结果弹窗
  const showImportResultModal = (successCount: number, skipCount: number, errors: string[], type: 'itemCategory' = 'itemCategory') => {
    const totalCount = successCount + skipCount + errors.length
    const title = t('itemCategory.importResultTitle')
    
    Modal.info({
      title: title,
      width: 600,
      content: (
        <div style={{ marginTop: '16px' }}>
          {/* 总体统计 */}
          <div style={{ 
            background: '#f6ffed', 
            border: '1px solid #b7eb8f', 
            borderRadius: '6px', 
            padding: '16px', 
            marginBottom: '16px' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '16px', marginRight: '8px' }} />
              <span style={{ fontWeight: 'bold', fontSize: '16px' }}>
                {t('itemCategory.importCompleted')}
              </span>
            </div>
            <div style={{ color: '#666', fontSize: '14px' }}>
              {t('itemCategory.importTotalProcessed').replace('{total}', totalCount.toString())}
            </div>
          </div>

          {/* 详细统计 */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ 
              flex: 1, 
              textAlign: 'center', 
              padding: '12px', 
              background: successCount > 0 ? '#f6ffed' : '#f5f5f5',
              border: `1px solid ${successCount > 0 ? '#b7eb8f' : '#d9d9d9'}`,
              borderRadius: '6px'
            }}>
              <div style={{ 
                color: successCount > 0 ? '#52c41a' : '#999', 
                fontSize: '24px', 
                fontWeight: 'bold',
                marginBottom: '4px'
              }}>
                {successCount}
              </div>
              <div style={{ color: '#666', fontSize: '12px' }}>
                {t('itemCategory.importSuccessCount')}
              </div>
            </div>
            
            <div style={{ 
              flex: 1, 
              textAlign: 'center', 
              padding: '12px', 
              background: skipCount > 0 ? '#fff7e6' : '#f5f5f5',
              border: `1px solid ${skipCount > 0 ? '#ffd591' : '#d9d9d9'}`,
              borderRadius: '6px'
            }}>
              <div style={{ 
                color: skipCount > 0 ? '#fa8c16' : '#999', 
                fontSize: '24px', 
                fontWeight: 'bold',
                marginBottom: '4px'
              }}>
                {skipCount}
              </div>
              <div style={{ color: '#666', fontSize: '12px' }}>
                {t('itemCategory.importSkipCount')}
              </div>
            </div>
            
            <div style={{ 
              flex: 1, 
              textAlign: 'center', 
              padding: '12px', 
              background: errors.length > 0 ? '#fff2f0' : '#f5f5f5',
              border: `1px solid ${errors.length > 0 ? '#ffccc7' : '#d9d9d9'}`,
              borderRadius: '6px'
            }}>
              <div style={{ 
                color: errors.length > 0 ? '#ff4d4f' : '#999', 
                fontSize: '24px', 
                fontWeight: 'bold',
                marginBottom: '4px'
              }}>
                {errors.length}
              </div>
              <div style={{ color: '#666', fontSize: '12px' }}>
                {t('itemCategory.importErrorCount')}
              </div>
            </div>
          </div>

          {/* 错误详情 */}
          {errors.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ 
                color: '#ff4d4f', 
                fontWeight: 'bold', 
                marginBottom: '8px',
                fontSize: '14px'
              }}>
                {t('itemCategory.importErrorDetails')}:
              </div>
              <div style={{ 
                maxHeight: '200px', 
                overflowY: 'auto', 
                background: '#fafafa', 
                padding: '12px', 
                borderRadius: '4px',
                border: '1px solid #d9d9d9'
              }}>
                {errors.map((error, index) => (
                  <div key={index} style={{ 
                    color: '#666', 
                    fontSize: '12px', 
                    marginBottom: '4px',
                    padding: '4px 0',
                    borderBottom: index < errors.length - 1 ? '1px solid #f0f0f0' : 'none'
                  }}>
                    {error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 操作建议 */}
          <div style={{ 
            marginTop: '16px', 
            padding: '12px', 
            background: '#f0f9ff', 
            border: '1px solid #91d5ff', 
            borderRadius: '6px',
            fontSize: '12px',
            color: '#666'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#1890ff' }}>
              💡 {t('itemCategory.importTips')}:
            </div>
            <div>• {t('itemCategory.importTip1')}</div>
            <div>• {t('itemCategory.importTip2')}</div>
            <div>• {t('itemCategory.importTip3')}</div>
          </div>
        </div>
      ),
      okText: t('common.confirm'),
      width: 600
    })
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
          <Col span={6}>
            <Input 
              placeholder={t('itemCategory.searchPlaceholder')} 
              allowClear 
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder={t('itemCategory.statusFilter')}
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
              allowClear
            >
              <Select.Option value="all">{t('itemCategory.allStatus')}</Select.Option>
              <Select.Option value="ACTIVE">{t('itemCategory.active')}</Select.Option>
              <Select.Option value="INACTIVE">{t('itemCategory.inactive')}</Select.Option>
            </Select>
          </Col>
          <Col span={14}>
            <Space>
              <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
                {t('itemCategory.downloadTemplate')}
              </Button>
              <Upload 
                accept=".xlsx,.xls" 
                showUploadList={false}
                beforeUpload={(file) => {
                  handleImport(file)
                  return false
                }}
              >
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
                  // 新增时不设置code字段，让后端自动生成
                  setModalOpen(true) 
                }}
              >
                {t('itemCategory.addCategory')}
              </Button>
            </Space>
          </Col>
        </Row>
        
        {/* 筛选结果统计 */}
        {!loading && (searchKeyword.trim() || statusFilter !== 'all') && (
          <div style={{ 
            marginBottom: 16, 
            padding: '12px 16px', 
            background: '#f5f5f5', 
            borderRadius: '6px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ color: '#666', fontSize: '14px' }}>
                {t('itemCategory.filterResults').replace('{count}', filteredCategories.length.toString())}
                {categories.length !== filteredCategories.length && (
                  <span style={{ marginLeft: 8, color: '#999' }}>
                    {t('itemCategory.fromTotalRecords').replace('{total}', categories.length.toString())}
                  </span>
                )}
              </span>
            </div>
            <Button 
              size="small" 
              onClick={() => {
                setSearchKeyword('')
                setStatusFilter('all')
              }}
            >
              {t('common.clearFilters')}
            </Button>
          </div>
        )}

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
          dataSource={filteredCategories} 
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
          {!editingCategory && (
            <Form.Item 
              name="code" 
              label={t('itemCategory.categoryCode')}
              extra={t('itemCategory.codeAutoGenerate')}
            >
              <Input 
                placeholder={t('itemCategory.codePlaceholder')} 
                disabled
                style={{ backgroundColor: '#f5f5f5' }}
              />
            </Form.Item>
          )}
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
