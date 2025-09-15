import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, Button, Space, Input, Select, Row, Col, message, Modal, Upload } from 'antd';
import { PlusOutlined, DownloadOutlined, UploadOutlined, CloseOutlined, CheckCircleOutlined } from '@ant-design/icons';
import Draggable from 'react-draggable';
import WorkerForm, { WorkerFormRef } from '../components/WorkerForm';
import WorkerTable from '../components/WorkerTable';
import QRCodeModal from '../components/QRCodeModal';
import { Worker, CreateWorkerRequest, UpdateWorkerRequest, Distributor, Site } from '../types/worker';
import { mockDistributors, mockSites, mockWorkers } from '../data/mockData';
import { useLocale } from '../contexts/LocaleContext';
import { useSiteFilter } from '../contexts/SiteFilterContext';
import apiService from '../services/api';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import { 
  readWorkerExcelFile,
  generateImportTemplate
} from '../utils/excelUtils';

const { Search } = Input;
const { Option } = Select;

const WorkerManagement: React.FC = () => {
  const { t } = useLocale();
  const { selectedSiteId } = useSiteFilter();
  const draggleRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<WorkerFormRef>(null);
  
  // 状态管理
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [qrCodeVisible, setQrCodeVisible] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  
  // 搜索和筛选状态（多选）
  const [searchText, setSearchText] = useState('');
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [distributorFilters, setDistributorFilters] = useState<string[]>([]);
  

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 并行加载所有数据
      const [workersData, distributorsData, sitesData] = await Promise.all([
        apiService.getAllWorkers({ siteId: selectedSiteId }),
        apiService.getAllDistributors(),
        apiService.getAllSites()
      ]);
      
      setWorkers(workersData);
      setDistributors(distributorsData);
      setSites(sitesData);
    } catch (error) {
      console.error('加载数据失败:', error);
      message.error('加载数据失败，请重试');
      // 降级到模拟数据
      loadMockData();
    } finally {
      setLoading(false);
    }
  }, [selectedSiteId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadMockData = () => {
    setDistributors(mockDistributors);
    setSites(mockSites);
    setWorkers(mockWorkers);
  };

  // 搜索和筛选
  const filteredWorkers = useMemo(() => {
    let result = workers;

    // 工地筛选（单选，优先筛选）
    if (selectedSiteId) {
      result = result.filter(worker => worker.siteId === selectedSiteId);
    }

    // 文本搜索
    if (searchText) {
      result = result.filter(worker =>
        worker.name.toLowerCase().includes(searchText.toLowerCase()) ||
        worker.workerId.toLowerCase().includes(searchText.toLowerCase()) ||
        worker.phone.includes(searchText) ||
        worker.idCard.includes(searchText)
      );
    }

    // 状态筛选（多选，空表示不过滤）
    if (statusFilters.length > 0) {
      result = result.filter(worker => statusFilters.includes(worker.status));
    }

    // 分判商筛选（多选，空表示不过滤）
    if (distributorFilters.length > 0) {
      result = result.filter(worker => distributorFilters.includes(worker.distributorId));
    }

    return result;
  }, [selectedSiteId, searchText, statusFilters, distributorFilters, workers]);

  // 处理新增工人
  const handleCreateWorker = async (values: CreateWorkerRequest) => {
    setLoading(true);
    try {
      const newWorker = await apiService.createWorker(values);
      setWorkers(prev => [newWorker, ...prev]);
      setFormVisible(false);
      // 成功消息由WorkerForm统一处理
    } catch (error) {
      console.error('创建工人失败:', error);
      // 重新抛出错误，让WorkerForm处理错误消息
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 处理更新工人
  const handleUpdateWorker = async (values: UpdateWorkerRequest) => {
    if (!editingWorker) return;
    
    setLoading(true);
    try {
      const updatedWorker = await apiService.updateWorker(editingWorker.id, values);
      
      setWorkers(prev => prev.map(worker =>
        worker.id === editingWorker.id ? updatedWorker : worker
      ));

      setFormVisible(false);
      setEditingWorker(null);
      // 成功消息由WorkerForm统一处理
    } catch (error) {
      console.error('更新工人失败:', error);
      // 重新抛出错误，让WorkerForm处理错误消息
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 处理删除工人
  const handleDeleteWorker = async (id: string) => {
    try {
      await apiService.deleteWorker(id);
      
      setWorkers(prev => prev.filter(worker => worker.id !== id));
      setFilteredWorkers(prev => prev.filter(worker => worker.id !== id));
      message.success(t('worker.deleteSuccess'));
    } catch (error) {
      console.error('删除工人失败:', error);
      message.error(t('worker.deleteFailed'));
    }
  };

  // 处理编辑工人
  const handleEditWorker = (worker: Worker) => {
    setEditingWorker(worker);
    setFormVisible(true);
  };

  // 处理查看二维码
  const handleViewQR = (worker: Worker) => {
    setSelectedWorker(worker);
    setQrCodeVisible(true);
  };


  // 重置表单
  const handleCancelForm = () => {
    setFormVisible(false);
    setEditingWorker(null);
  };

  // 下载模板
  const handleDownloadTemplate = async () => {
    try {
      const response = await apiService.downloadWorkerTemplate();
      const { template } = response;
      
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(template.sampleData);
      
      // 设置列宽
      const colWidths = [
        { wch: 15 }, // 工人编号
        { wch: 10 }, // 姓名
        { wch: 8 },  // 性别
        { wch: 20 }, // 身份证号
        { wch: 12 }, // 出生日期
        { wch: 12 }, // 地区
        { wch: 15 }, // 分判商
        { wch: 15 }, // 工地
        { wch: 15 }, // 电话
        { wch: 20 }, // 邮箱
        { wch: 15 }, // WhatsApp
        { wch: 8 }   // 状态
      ];
      worksheet['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(workbook, worksheet, t('worker.template'));
      
      const fileName = `工人导入模板_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      message.success(t('worker.templateDownloaded'));
    } catch (error) {
      console.error('下载模板失败:', error);
      message.error(t('worker.templateDownloadFailed'));
    }
  };

  // 显示工人导出选择对话框
  const showWorkerExportOptions = async () => {
    const currentSiteName = selectedSiteId ? sites.find(s => s.id === selectedSiteId)?.name : null
    const currentSiteWorkers = selectedSiteId ? workers.filter(w => w.siteId === selectedSiteId) : []
    const currentSiteCount = currentSiteWorkers.length
    
    // 获取全部工人数量
    let allWorkersCount = 0
    try {
      const allWorkersResponse = await apiService.getAllWorkers({})
      allWorkersCount = allWorkersResponse.length
    } catch (error) {
      console.error('获取全部工人数量失败:', error)
      allWorkersCount = workers.length // 降级使用当前数据
    }

    Modal.confirm({
      title: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{t('admin.exportWorkersTitle')}</span>
          <Button 
            type="text" 
            size="small" 
            icon={<CloseOutlined />} 
            onClick={() => Modal.destroyAll()}
            style={{ marginRight: -8 }}
          />
        </div>
      ),
      icon: <DownloadOutlined style={{ color: '#1890ff' }} />,
      content: (
        <div>
          <p style={{ marginBottom: '16px', fontSize: '14px' }}>
            {t('admin.exportWorkersDescription')}
          </p>
          
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px',
            marginBottom: '16px'
          }}>
            {/* 导出当前全局工地选择的工人数据 */}
            <div 
              style={{ 
                padding: '12px 16px', 
                border: '1px solid #d9d9d9', 
                borderRadius: '6px',
                cursor: 'pointer',
                background: '#fafafa',
                transition: 'all 0.2s'
              }}
              onClick={() => {
                Modal.destroyAll()
                handleExportCurrentSiteWorkers()
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
                  {t('admin.exportCurrentSiteWorkers')}
                </span>
                <span style={{ 
                  background: '#1890ff', 
                  color: 'white', 
                  padding: '2px 8px', 
                  borderRadius: '12px',
                  fontSize: '12px'
                }}>
                  {currentSiteCount}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {currentSiteName ? 
                  t('admin.exportCurrentSiteWorkersDescription').replace('{siteName}', currentSiteName) :
                  t('admin.noSiteSelected')
                }
              </div>
            </div>

            {/* 导出所有工人的数据 */}
            <div 
              style={{ 
                padding: '12px 16px', 
                border: '1px solid #d9d9d9', 
                borderRadius: '6px',
                cursor: 'pointer',
                background: '#fafafa',
                transition: 'all 0.2s'
              }}
              onClick={() => {
                Modal.destroyAll()
                handleExportAllWorkers()
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
                  {t('admin.exportAllWorkers')}
                </span>
                <span style={{ 
                  background: '#52c41a', 
                  color: 'white', 
                  padding: '2px 8px', 
                  borderRadius: '12px',
                  fontSize: '12px'
                }}>
                  {allWorkersCount}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {t('admin.exportAllWorkersDescription')}
              </div>
            </div>
          </div>
        </div>
      ),
      okText: t('common.cancel'),
      cancelText: null,
      width: 500
    })
  }

  // 导出当前全局工地选择的工人数据
  const handleExportCurrentSiteWorkers = async () => {
    if (!selectedSiteId) {
      message.warning(t('admin.noSiteSelectedForExport'))
      return
    }

    try {
      const filters = {
        siteId: selectedSiteId,
        distributorId: distributorFilters.length === 1 ? distributorFilters[0] : undefined,
        status: statusFilters.length === 1 ? statusFilters[0] : undefined
      };

      const response = await apiService.exportWorkers(filters);
      
      const exportData = response.workers.map((worker: any) => ({
        [t('worker.workerId')]: worker.workerId,
        [t('worker.name')]: worker.name,
        [t('worker.gender')]: worker.gender === 'MALE' ? t('worker.male') : t('worker.female'),
        [t('worker.idCard')]: worker.idCard,
        [t('worker.birthDate')]: worker.birthDate ? dayjs(worker.birthDate).format('YYYY-MM-DD') : '-',
        [t('worker.region')]: worker.region || '-',
        [t('worker.distributor')]: worker.distributorId || '-',
        [t('worker.site')]: worker.siteCode || '-',
        [t('worker.phone')]: worker.phone,
        [t('worker.email')]: worker.email || '-',
        [t('worker.whatsapp')]: worker.whatsapp || '-',
        [t('worker.status')]: worker.status === 'ACTIVE' ? t('worker.active') : t('worker.inactive')
      }));
      

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // 设置列宽
      const colWidths = [
        { wch: 15 }, // 工人编号
        { wch: 10 }, // 姓名
        { wch: 8 },  // 性别
        { wch: 20 }, // 身份证号
        { wch: 12 }, // 出生日期
        { wch: 12 }, // 地区
        { wch: 15 }, // 分判商
        { wch: 15 }, // 工地
        { wch: 15 }, // 电话
        { wch: 20 }, // 邮箱
        { wch: 15 }, // WhatsApp
        { wch: 8 }   // 状态
      ];
      worksheet['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(workbook, worksheet, t('worker.export'));
      
      const fileName = `工人数据_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      message.success(t('admin.currentSiteWorkersExported').replace('{count}', exportData.length.toString()));
    } catch (error) {
      console.error('导出失败:', error);
      message.error(t('worker.exportFailed'));
    }
  }

  // 导出所有工人的数据
  const handleExportAllWorkers = async () => {
    try {
      const response = await apiService.exportWorkers({});
      
      const exportData = response.workers.map((worker: any) => ({
        [t('worker.workerId')]: worker.workerId,
        [t('worker.name')]: worker.name,
        [t('worker.gender')]: worker.gender === 'MALE' ? t('worker.male') : t('worker.female'),
        [t('worker.idCard')]: worker.idCard,
        [t('worker.birthDate')]: worker.birthDate ? dayjs(worker.birthDate).format('YYYY-MM-DD') : '-',
        [t('worker.region')]: worker.region || '-',
        [t('worker.distributor')]: worker.distributorId || '-',
        [t('worker.site')]: worker.siteCode || '-',
        [t('worker.phone')]: worker.phone,
        [t('worker.email')]: worker.email || '-',
        [t('worker.whatsapp')]: worker.whatsapp || '-',
        [t('worker.status')]: worker.status === 'ACTIVE' ? t('worker.active') : t('worker.inactive')
      }));
      

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // 设置列宽
      const colWidths = [
        { wch: 15 }, // 工人编号
        { wch: 10 }, // 姓名
        { wch: 8 },  // 性别
        { wch: 20 }, // 身份证号
        { wch: 12 }, // 出生日期
        { wch: 12 }, // 地区
        { wch: 15 }, // 分判商
        { wch: 15 }, // 工地
        { wch: 15 }, // 电话
        { wch: 20 }, // 邮箱
        { wch: 15 }, // WhatsApp
        { wch: 8 }   // 状态
      ];
      worksheet['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(workbook, worksheet, t('worker.export'));
      
      const fileName = `工人数据_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      message.success(t('admin.allWorkersExported').replace('{count}', exportData.length.toString()));
    } catch (error) {
      console.error('导出失败:', error);
      message.error(t('worker.exportFailed'));
    }
  };


  // 导入工人数据
  const handleImport = async (file: File) => {
    try {
      const { workers: importedWorkers, errors } = await readWorkerExcelFile(file, distributors, sites)
      
      if (errors.length > 0) {
        message.error(t('worker.importFailed').replace('{errors}', errors.join('; ')))
        return
      }
      
      if (importedWorkers.length === 0) {
        message.warning(t('worker.noValidData'))
        return
      }
      
      // 显示导入确认对话框
      Modal.confirm({
        title: t('worker.importConfirm'),
        content: (
          <div>
            <p>{t('worker.importConfirmMessage').replace('{count}', importedWorkers.length.toString())}</p>
            <p style={{ color: '#1890ff', marginTop: '8px' }}>
              {t('worker.importDefaultSiteMessage').replace('{siteName}', selectedSiteId ? sites.find(s => s.id === selectedSiteId)?.name || '' : t('worker.noSiteSelected'))}
            </p>
            <p style={{ color: '#666', fontSize: '12px', marginTop: '8px' }}>
              {t('worker.importRulesMessage')}
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
                  ⚠️ {t('worker.importWarnings')}:
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
          await processWorkerImport(importedWorkers)
        }
      })
    } catch (error) {
      message.error(t('worker.importFailed').replace('{errors}', (error as Error).message))
    }
  }

  // 处理工人导入
  const processWorkerImport = async (importedWorkers: Record<string, unknown>[]) => {
    try {
      setLoading(true)
      
      let successCount = 0
      let skipCount = 0
      const errors: string[] = []

      for (const workerData of importedWorkers) {
        try {
          // 准备导入数据
          const importData = {
            name: String(workerData.name || ''),
            gender: String(workerData.gender || 'MALE'),
            idCard: String(workerData.idCard || ''),
            birthDate: workerData.birthDate ? String(workerData.birthDate) : '',
            region: workerData.region ? String(workerData.region) : '中国大陆',
            phone: String(workerData.phone || ''),
            email: workerData.email ? String(workerData.email) : '',
            whatsapp: workerData.whatsapp ? String(workerData.whatsapp) : '',
            status: String(workerData.status || 'ACTIVE'),
            distributorId: workerData.distributorId ? String(workerData.distributorId) : null,
            siteId: workerData.siteId ? String(workerData.siteId) : selectedSiteId
          }

          // 调用API创建工人
          await apiService.createWorker(importData)
          successCount++
        } catch (error: any) {
          if (error.status === 409) {
            // 身份证号重复，跳过
            skipCount++
            console.log(`跳过重复的工人: ${workerData.name} (身份证: ${importData.idCard})`)
          } else {
            // 其他错误
            errors.push(`${workerData.name}: ${error.message || '创建失败'}`)
          }
        }
      }

      // 重新加载数据
      await loadData()

      // 显示导入结果弹窗
      showWorkerImportResultModal(successCount, skipCount, errors)
    } catch (error) {
      console.error('Import processing failed:', error)
      message.error(t('worker.importFailed').replace('{errors}', (error as Error).message))
    } finally {
      setLoading(false)
    }
  }

  // 显示工人导入结果弹窗
  const showWorkerImportResultModal = (successCount: number, skipCount: number, errors: string[]) => {
    const totalCount = successCount + skipCount + errors.length
    
    Modal.info({
      title: t('worker.importResultTitle'),
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
                {t('worker.importCompleted')}
              </span>
            </div>
            <div style={{ color: '#666', fontSize: '14px' }}>
              {t('worker.importTotalProcessed').replace('{total}', totalCount.toString())}
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
                {t('worker.importSuccessCount')}
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
                {t('worker.importSkipCount')}
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
                {t('worker.importErrorCount')}
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
                {t('worker.importErrorDetails')}:
              </div>
              <div style={{ 
                maxHeight: '200px', 
                overflowY: 'auto', 
                background: '#fafafa', 
                border: '1px solid #d9d9d9', 
                borderRadius: '4px', 
                padding: '8px'
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
        </div>
      ),
      okText: t('common.ok')
    })
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* 页面标题和工地筛选 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
            {t('worker.title')}
          </h2>
          <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '14px' }}>
            {t('guard.totalWorkers').replace('{count}', workers.length.toString())}
          </p>
        </div>
      </div>

      {/* 操作栏 */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Search
              placeholder={t('worker.searchPlaceholder')}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col span={6}>
            <Select
              mode="multiple"
              placeholder={t('worker.statusFilter')}
              value={statusFilters}
              onChange={(vals) => setStatusFilters(vals)}
              style={{ width: '100%' }}
              allowClear
            >
              <Option value="ACTIVE">{t('worker.active')}</Option>
              <Option value="INACTIVE">{t('worker.inactive')}</Option>
            </Select>
          </Col>
          <Col span={6}>
            <Select
              mode="multiple"
              placeholder={t('worker.distributorFilter')}
              value={distributorFilters}
              onChange={(vals) => setDistributorFilters(vals)}
              style={{ width: '100%' }}
              allowClear
            >
              {distributors.map(dist => (
                <Option key={dist.id} value={dist.id}>{dist.name}</Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
            <Space wrap>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleDownloadTemplate}
                size="small"
              >
                {t('guard.downloadTemplate')}
              </Button>
              <Upload
                accept=".xlsx,.xls"
                showUploadList={false}
                beforeUpload={(file) => {
                  handleImport(file)
                  return false
                }}
              >
                <Button
                  icon={<UploadOutlined />}
                  size="small"
                >
                  {t('worker.import')}
                </Button>
              </Upload>
              <Button
                icon={<DownloadOutlined />}
                onClick={showWorkerExportOptions}
                size="small"
              >
                {t('worker.export')}
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setFormVisible(true)}
                size="small"
              >
                {t('guard.add')}
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 筛选结果统计 */}
      {!loading && (searchText.trim() || statusFilters.length > 0 || distributorFilters.length > 0) && (
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
              {t('worker.filterResults').replace('{count}', filteredWorkers.length.toString())}
              {workers.length !== filteredWorkers.length && (
                <span style={{ marginLeft: 8, color: '#999' }}>
                  {t('worker.fromTotalRecords').replace('{total}', workers.length.toString())}
                </span>
              )}
            </span>
          </div>
          <Button 
            size="small" 
            onClick={() => {
              setSearchText('')
              setStatusFilters([])
              setDistributorFilters([])
            }}
          >
            {t('common.clearFilters')}
          </Button>
        </div>
      )}

      {/* 工人表格 */}
      <Card>
        <WorkerTable
          workers={filteredWorkers}
          distributors={distributors}
          sites={sites}
          onEdit={handleEditWorker}
          onDelete={handleDeleteWorker}
          onViewQR={handleViewQR}
          loading={loading}
        />
      </Card>

      {/* 新增/编辑表单模态框 */}
      <Modal
        title={
          <div
            style={{ width: '100%', cursor: 'move' }}
            onMouseOver={() => {
              if (draggleRef.current) {
                draggleRef.current.style.cursor = 'move';
              }
            }}
            onMouseOut={() => {
              if (draggleRef.current) {
                draggleRef.current.style.cursor = 'default';
              }
            }}
          >
            {editingWorker ? t('worker.editWorker') : t('worker.addWorker')}
          </div>
        }
        open={formVisible}
        onCancel={handleCancelForm}
        footer={[
          <Button key="cancel" onClick={handleCancelForm}>
            {t('common.cancel')}
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={loading}
            onClick={() => {
              formRef.current?.submit();
            }}
          >
            {editingWorker ? t('common.save') : t('common.add')}
          </Button>
        ]}
        width="90vw"
        style={{ 
          top: 20, 
          maxWidth: '1200px',
          minWidth: '600px'
        }}
        styles={{
          body: {
            height: 'calc(100vh - 280px)', 
            overflowY: 'auto',
            padding: '20px'
          }
        }}
        destroyOnClose
        maskClosable={false}
        closable={true}
        centered={false}
        modalRender={(modal) => (
          <Draggable
            nodeRef={draggleRef}
            bounds="parent"
            handle=".ant-modal-header"
          >
            <div ref={draggleRef}>{modal}</div>
          </Draggable>
        )}
      >
        <WorkerForm
          ref={formRef}
          worker={editingWorker}
          distributors={distributors}
          sites={sites}
          onSubmit={editingWorker ? handleUpdateWorker : handleCreateWorker}
          onCancel={handleCancelForm}
          loading={loading}
          showButtons={false}
          selectedSiteId={selectedSiteId}
        />
      </Modal>

      {/* 二维码模态框 */}
      <QRCodeModal
        worker={selectedWorker}
        visible={qrCodeVisible}
        onClose={() => {
          setQrCodeVisible(false);
          setSelectedWorker(null);
        }}
      />

    </div>
  );
};

export default WorkerManagement;
