import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, Button, Space, Input, Select, message, Modal, Upload } from 'antd';
import { PlusOutlined, DownloadOutlined, UploadOutlined, CloseOutlined, CheckCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import Draggable from 'react-draggable';
import WorkerForm, { WorkerFormRef } from './WorkerForm';
import WorkerTable from './WorkerTable';
import QRCodeModal from './QRCodeModal';
import { Worker, CreateWorkerRequest, UpdateWorkerRequest, Distributor, Site } from '../types/worker';
import { mockDistributors, mockSites, mockWorkers } from '../data/mockData';
import { useLocale } from '../contexts/LocaleContext';
import { useSiteFilter } from '../contexts/SiteFilterContext';
import apiService from '../services/api';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import { 
  generateImportTemplate,
  getAreaCodeFromRegion
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
      message.error(t('messages.loadDataFailed'));
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
      message.success(t('worker.deleteSuccess'));
    } catch (error) {
      console.error('删除工人失败:', error);
      message.error(t('worker.deleteFailed'));
    }
  };

  // 处理切换工人状态
  const handleToggleStatus = async (worker: Worker) => {
    const newStatus = worker.status === 'active' ? 'inactive' : 'active';
    const backendStatus = newStatus === 'active' ? 'ACTIVE' : 'INACTIVE';
    
    try {
      // 只发送状态字段，避免影响其他字段
      const updateData = { status: backendStatus };
      
      // 调用后端API更新工人状态
      await apiService.updateWorker(worker.id, updateData);
      
      // 更新本地状态
      setWorkers(prev => prev.map(w => 
        w.id === worker.id 
          ? { ...w, status: newStatus, updatedAt: new Date().toISOString() }
          : w
      ));
      
      // 显示成功消息
      message.success(t('worker.statusUpdated', { 
        status: newStatus === 'active' ? t('worker.active') : t('worker.inactive') 
      }));
    } catch (error) {
      console.error('更新工人状态失败:', error);
      message.error(t('worker.operationFailed'));
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
      // 使用统一的英文表头模板，与分判商页面保持一致
      generateImportTemplate();
      
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
      message.warning(t('messages.pleaseSelectSitesToExport'))
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
        'Worker ID': worker.workerId,
        'Name': worker.name,
        'Gender': worker.gender === 'MALE' ? 'Male' : 'Female',
        'ID Type': worker.idType,
        'ID Number': worker.idNumber,
        'Birth Date': worker.birthDate ? dayjs(worker.birthDate).format('YYYY-MM-DD') : '',
        'Region': worker.region || '',
        'Distributor ID': worker.distributorId || '',
        'Site ID': worker.siteCode || '',
        'Phone': worker.phone,
        'Email': worker.email || '',
        'WhatsApp': worker.whatsapp || '',
        'Status': worker.status === 'ACTIVE' ? 'Active' : 'Inactive'
      }));
      

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // 设置列宽
      const colWidths = [
        { wch: 15 }, // 工人编号
        { wch: 10 }, // 姓名
        { wch: 8 },  // 性别
        { wch: 12 }, // 证件类型
        { wch: 20 }, // 证件号码
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
        'Worker ID': worker.workerId,
        'Name': worker.name,
        'Gender': worker.gender === 'MALE' ? 'Male' : 'Female',
        'ID Type': worker.idType,
        'ID Number': worker.idNumber,
        'Birth Date': worker.birthDate ? dayjs(worker.birthDate).format('YYYY-MM-DD') : '',
        'Region': worker.region || '',
        'Distributor ID': worker.distributorId || '',
        'Site ID': worker.siteCode || '',
        'Phone': worker.phone,
        'Email': worker.email || '',
        'WhatsApp': worker.whatsapp || '',
        'Status': worker.status === 'ACTIVE' ? 'Active' : 'Inactive'
      }));
      

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // 设置列宽
      const colWidths = [
        { wch: 15 }, // 工人编号
        { wch: 10 }, // 姓名
        { wch: 8 },  // 性别
        { wch: 12 }, // 证件类型
        { wch: 20 }, // 证件号码
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
      // 直接上传Excel文件给后端处理
      console.log(`准备上传Excel文件: ${file.name}`)
      const result = await apiService.importAdminWorkersFromExcel(file)
      
      // 如果有成功导入的工人，获取最新工人数据
      if (result.success > 0) {
        try {
          // 获取最近导入的工人数据
          const latestWorkers = await apiService.getAllWorkers({
            limit: result.success,
            orderBy: 'createdAt',
            orderDirection: 'desc'
          });
          
          // 将新工人添加到本地状态
          if (latestWorkers && latestWorkers.length > 0) {
            setWorkers(prev => [...latestWorkers, ...prev]);
          }
        } catch (fetchError) {
          console.error('获取最新导入的工人数据失败:', fetchError);
          // 如果获取失败，就不更新本地状态
        }
      }

      // 显示导入结果弹窗
      showWorkerImportResultModal(result.success, result.skipped, result.errorDetails || [])
    } catch (error) {
      console.error('Import failed:', error)
      message.error(t('worker.importFailed').replace('{errors}', (error as Error).message))
    }
  }

  // 处理工人导入
  const processWorkerImport = async (importedWorkers: Record<string, unknown>[]) => {
    try {
      setLoading(true)
      
      // 准备导入数据
      const workersData = importedWorkers.map((workerData, index) => {
        // 获取原始地区名称并转换为区号
        const rawRegion = workerData.region ? String(workerData.region) : t('regions.mainland');
        const areaCode = getAreaCodeFromRegion(rawRegion, t);
        
        // 调试信息：显示地区识别过程
        if (rawRegion) {
          console.log(`第${index + 1}行地区识别：输入"${rawRegion}" -> 识别为区号"${areaCode}"`);
        }

        return {
          name: String(workerData.name || ''),
          gender: String(workerData.gender || 'MALE'),
          idCard: String(workerData.idCard || ''),
          birthDate: workerData.birthDate ? String(workerData.birthDate) : '',
          region: areaCode, // 保存识别出的区号
          phone: String(workerData.phone || ''),
          email: workerData.email ? String(workerData.email) : '',
          whatsapp: workerData.whatsapp ? String(workerData.whatsapp) : '',
          status: String(workerData.status || 'ACTIVE'),
          distributorId: workerData.distributorId ? String(workerData.distributorId) : null,
          siteId: workerData.siteId ? String(workerData.siteId) : selectedSiteId
        };
      })

      // 使用批量导入API
      const result = await apiService.importWorkers(workersData)
      
      // 如果有成功导入的工人，尝试获取这些工人的完整数据
      if (result.success > 0) {
        try {
          // 这里我们可以获取最近导入的工人数据
          // 使用当前筛选条件，但限制结果数量为最近导入的数量
          const latestWorkers = await apiService.getAllWorkers({
            limit: result.success,
            orderBy: 'createdAt',
            orderDirection: 'desc'
          });
          
          // 将新工人添加到本地状态
          if (latestWorkers && latestWorkers.length > 0) {
            setWorkers(prev => [...latestWorkers, ...prev]);
          }
        } catch (fetchError) {
          console.error('获取最新导入的工人数据失败:', fetchError);
          // 如果获取最新工人失败，仍然显示导入结果，但不更新本地状态
        }
      }

      // 显示导入结果弹窗
      showWorkerImportResultModal(result.success, result.skipped, result.errorDetails || [])
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
    <div style={{ padding: '12px' }}>
      {/* 页面标题和操作区域 */}
      <div style={{ 
        marginBottom: 12, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* 左侧标题区域 */}
        <div style={{ flex: '1 1 auto', minWidth: '300px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            {t('worker.title')}
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '13px' }}>
            {t('guard.totalWorkers').replace('{count}', workers.length.toString())}
          </p>
        </div>

        {/* 右侧筛选和操作区域 */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          flexWrap: 'wrap',
          justifyContent: 'flex-end'
        }}>
          {/* 搜索框 */}
          <Search
            placeholder={t('worker.searchPlaceholder')}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ 
              minWidth: '200px',
              maxWidth: '300px',
              width: 'clamp(200px, 25vw, 300px)'
            }}
          />
          
          {/* 状态筛选 */}
          <Select
            mode="multiple"
            placeholder={t('worker.statusFilter')}
            value={statusFilters}
            onChange={(vals) => setStatusFilters(vals)}
            style={{ 
              minWidth: '120px',
              maxWidth: '150px',
              width: 'clamp(120px, 15vw, 150px)'
            }}
            allowClear
          >
            <Option value="ACTIVE">{t('worker.active')}</Option>
            <Option value="INACTIVE">{t('worker.inactive')}</Option>
          </Select>

          {/* 分判商筛选 */}
          <Select
            mode="multiple"
            placeholder={t('worker.distributorFilter')}
            value={distributorFilters}
            onChange={(vals) => setDistributorFilters(vals)}
            style={{ 
              minWidth: '120px',
              maxWidth: '150px',
              width: 'clamp(120px, 15vw, 150px)'
            }}
            allowClear
          >
            {distributors.map(dist => (
              <Option key={dist.id} value={dist.id}>{dist.name}</Option>
            ))}
          </Select>

          {/* 操作按钮组 */}
          <Space 
            size="small"
            style={{
              flexWrap: 'wrap',
              justifyContent: 'flex-end'
            }}
          >
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
              icon={<ReloadOutlined />}
              onClick={loadData}
              loading={loading}
              size="small"
            >
              {t('common.refresh')}
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
        </div>
      </div>

      {/* 筛选结果统计 */}
      {!loading && (searchText.trim() || statusFilters.length > 0 || distributorFilters.length > 0) && (
        <div style={{ 
          marginBottom: 8, 
          padding: '8px 12px', 
          background: '#f5f5f5', 
          borderRadius: '4px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: '#666', fontSize: '13px' }}>
              {t('worker.filterResults').replace('{count}', filteredWorkers.length.toString())}
              {workers.length !== filteredWorkers.length && (
                <span style={{ marginLeft: 6, color: '#999' }}>
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
      <Card style={{ 
        margin: 0,
        height: 'calc(100vh - 200px)', 
        display: 'flex', 
        flexDirection: 'column'
      }}
      styles={{
        body: {
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          padding: 0, 
          overflow: 'hidden'
        }
      }}>
        <WorkerTable
          workers={filteredWorkers}
          distributors={distributors}
          sites={sites}
          onEdit={handleEditWorker}
          onDelete={handleDeleteWorker}
          onViewQR={handleViewQR}
          onToggleStatus={handleToggleStatus}
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
