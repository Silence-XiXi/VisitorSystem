import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Space, Input, Select, Row, Col, message, Modal } from 'antd';
import { PlusOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import Draggable from 'react-draggable';
import WorkerForm from '../components/WorkerForm';
import WorkerTable from '../components/WorkerTable';
import QRCodeModal from '../components/QRCodeModal';
import ExcelImportExportModal from '../components/ExcelImportExportModal';
import { Worker, CreateWorkerRequest, UpdateWorkerRequest, Distributor, Site } from '../types/worker';
import { mockDistributors, mockSites, mockWorkers } from '../data/mockData';
import { useLocale } from '../contexts/LocaleContext';
import { useSiteFilter } from '../contexts/SiteFilterContext';

const { Search } = Input;
const { Option } = Select;

const WorkerManagement: React.FC = () => {
  const { t } = useLocale();
  const { selectedSiteId } = useSiteFilter();
  const draggleRef = useRef<HTMLDivElement>(null);
  
  // 状态管理
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [filteredWorkers, setFilteredWorkers] = useState<Worker[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [qrCodeVisible, setQrCodeVisible] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [excelModalVisible, setExcelModalVisible] = useState(false);
  
  // 搜索和筛选状态（多选）
  const [searchText, setSearchText] = useState('');
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [distributorFilters, setDistributorFilters] = useState<string[]>([]);
  

  // 加载模拟数据
  useEffect(() => {
    loadMockData();
  }, []);

  const loadMockData = () => {
    setDistributors(mockDistributors);
    setSites(mockSites);
    setWorkers(mockWorkers);
    setFilteredWorkers(mockWorkers);
  };

  // 搜索和筛选
  useEffect(() => {
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

    setFilteredWorkers(result);
  }, [workers, selectedSiteId, searchText, statusFilters, distributorFilters]);

  // 处理新增工人
  const handleCreateWorker = async (values: CreateWorkerRequest) => {
    setLoading(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newWorker: Worker = {
        ...values,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setWorkers(prev => [newWorker, ...prev]);
      setFormVisible(false);
      message.success(t('worker.createSuccess'));
    } catch (error) {
      message.error(t('worker.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  // 处理更新工人
  const handleUpdateWorker = async (values: UpdateWorkerRequest) => {
    setLoading(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setWorkers(prev => prev.map(worker =>
        worker.id === values.id
          ? { ...worker, ...values, updatedAt: new Date().toISOString() }
          : worker
      ));

      setFormVisible(false);
      setEditingWorker(null);
      message.success(t('worker.updateSuccess'));
    } catch (error) {
      message.error(t('worker.updateFailed'));
    } finally {
      setLoading(false);
    }
  };

  // 处理删除工人
  const handleDeleteWorker = async (id: string) => {
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setWorkers(prev => prev.filter(worker => worker.id !== id));
      message.success(t('worker.deleteSuccess'));
    } catch (error) {
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

  // 处理Excel导入
  const handleExcelImport = async (importWorkers: CreateWorkerRequest[]) => {
    setLoading(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 为导入的工人生成ID和时间戳
      const newWorkers: Worker[] = importWorkers.map(worker => ({
        ...worker,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      // 添加到现有工人列表
      setWorkers(prev => [...newWorkers, ...prev]);
      message.success(t('worker.importSuccess').replace('{count}', importWorkers.length.toString()));
      
    } catch (error) {
      message.error(t('worker.importFailed'));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 重置表单
  const handleCancelForm = () => {
    setFormVisible(false);
    setEditingWorker(null);
  };

  // 下载模板
  const handleDownloadTemplate = () => {
    // TODO: 实现实际的模板下载逻辑
    message.success(t('worker.templateDownloaded'));
  };

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
              <Option value="active">{t('worker.active')}</Option>
              <Option value="suspended">{t('worker.suspended')}</Option>
              <Option value="inactive">{t('worker.inactive')}</Option>
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
              <Button
                icon={<UploadOutlined />}
                onClick={() => setExcelModalVisible(true)}
                size="small"
              >
                {t('guard.import')}
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={() => setExcelModalVisible(true)}
                size="small"
              >
                {t('guard.export')}
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
              // 触发表单提交
              const formElement = document.querySelector('.worker-form .ant-form') as HTMLFormElement;
              if (formElement) {
                formElement.requestSubmit();
              }
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
        bodyStyle={{ 
          height: 'calc(100vh - 280px)', 
          overflowY: 'auto',
          padding: '20px'
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
          worker={editingWorker}
          distributors={distributors}
          sites={sites}
          onSubmit={editingWorker ? handleUpdateWorker : handleCreateWorker}
          onCancel={handleCancelForm}
          loading={loading}
          showButtons={false}
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

      {/* Excel导入导出模态框 */}
      <ExcelImportExportModal
        visible={excelModalVisible}
        onClose={() => setExcelModalVisible(false)}
        workers={workers}
        distributors={distributors}
        sites={sites}
        onImport={handleExcelImport}
      />
    </div>
  );
};

export default WorkerManagement;
