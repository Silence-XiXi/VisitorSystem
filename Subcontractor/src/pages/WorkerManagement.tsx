import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Input, Select, Row, Col, message, Modal, Typography, Statistic } from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined, UserOutlined, TeamOutlined, ClockCircleOutlined, FileExcelOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import WorkerForm from '../components/WorkerForm';
import WorkerTable from '../components/WorkerTable';
import QRCodeModal from '../components/QRCodeModal';
import ExcelImportExportModal from '../components/ExcelImportExportModal';
import { Worker, CreateWorkerRequest, UpdateWorkerRequest, Distributor, Site } from '../types/worker';
import { mockDistributors, mockSites, mockWorkers } from '../data/mockData';
import { useLocale } from '../contexts/LocaleContext';

const { Search } = Input;
const { Option } = Select;
const { Title } = Typography;

const WorkerManagement: React.FC = () => {
  const { t } = useLocale();
  
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
  const [siteFilters, setSiteFilters] = useState<string[]>([]);

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

    // 工地筛选（多选，空表示不过滤）
    if (siteFilters.length > 0) {
      result = result.filter(worker => siteFilters.includes(worker.siteId));
    }

    setFilteredWorkers(result);
  }, [workers, searchText, statusFilters, distributorFilters, siteFilters]);

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
      message.success(`成功导入 ${importWorkers.length} 个工人信息`);
      
    } catch (error) {
      message.error('导入失败，请重试');
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

  // 统计信息
  const getStatistics = () => {
    const total = workers.length;
    const active = workers.filter(w => w.status === 'active').length;
    const suspended = workers.filter(w => w.status === 'suspended').length;
    const inactive = workers.filter(w => w.status === 'inactive').length;

    return { total, active, suspended, inactive };
  };

  const stats = getStatistics();

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>{t('worker.title')}</Title>
      
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('worker.totalWorkers')}
              value={stats.total}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('worker.activeWorkers')}
              value={stats.active}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('worker.suspendedWorkers')}
              value={stats.suspended}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('worker.inactiveWorkers')}
              value={stats.inactive}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 操作栏 */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={16} align="middle">
          <Col span={4}>
            <Search
              placeholder={t('worker.searchPlaceholder')}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col span={4}>
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
          <Col span={4}>
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
          <Col span={4}>
            <Select
              mode="multiple"
              placeholder={t('worker.siteFilter')}
              value={siteFilters}
              onChange={(vals) => setSiteFilters(vals)}
              style={{ width: '100%' }}
              allowClear
            >
              {sites.map(site => (
                <Option key={site.id} value={site.id}>{site.name}</Option>
              ))}
            </Select>
          </Col>
          <Col span={8}>
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setFormVisible(true)}
              >
                {t('worker.addWorker')}
              </Button>
              <Button
                icon={<UploadOutlined />}
                onClick={() => setExcelModalVisible(true)}
              >
                Excel导入
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={() => setExcelModalVisible(true)}
              >
                Excel导出
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadMockData}
              >
                {t('common.refresh')}
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
        title={editingWorker ? t('worker.editWorker') : t('worker.addWorker')}
        open={formVisible}
        onCancel={handleCancelForm}
        footer={null}
        width={800}
        destroyOnClose
      >
        <WorkerForm
          worker={editingWorker}
          distributors={distributors}
          sites={sites}
          onSubmit={editingWorker ? handleUpdateWorker : handleCreateWorker}
          onCancel={handleCancelForm}
          loading={loading}
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
