import React, { useState, useMemo } from 'react';
import { Table, Button, Space, Modal, Tag, Tooltip, Row, Col, message, Timeline, Divider, List, Card, Statistic } from 'antd';
import { EditOutlined, DeleteOutlined, QrcodeOutlined, EyeOutlined, MailOutlined, WhatsAppOutlined, HistoryOutlined, ClockCircleOutlined, LogoutOutlined } from '@ant-design/icons';
import { Worker, Distributor, Site } from '../types/worker';
import { VisitorRecord } from '../services/api';
import dayjs from '../utils/dayjs';
import { useLocale } from '../contexts/LocaleContext';
import apiService from '../services/api';


interface WorkerTableProps {
  workers: Worker[];
  distributors: Distributor[];
  sites: Site[];
  onEdit: (worker: Worker) => void;
  onDelete: (id: string) => void;
  onViewQR: (worker: Worker) => void;
  loading?: boolean;
}

const WorkerTable: React.FC<WorkerTableProps> = ({
  workers,
  distributors,
  sites,
  onEdit,
  onDelete,
  onViewQR,
  loading = false
}) => {
  const { t } = useLocale();
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [sendingLoading, setSendingLoading] = useState(false);
  
  // 访客记录和借用物品记录相关状态
  const [visitorRecords, setVisitorRecords] = useState<VisitorRecord[]>([]);
  const [borrowRecords, setBorrowRecords] = useState<any[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  // 获取分判商名称
  const getDistributorName = (distributorId: string) => {
    const distributor = distributors.find(d => d.id === distributorId);
    return distributor ? distributor.name : '-';
  };

  // 获取工地名称
  const getSiteName = (siteId: string) => {
    const site = sites.find(s => s.id === siteId);
    return site ? site.name : '-';
  };

  // 计算年龄
  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return '-';
    try {
      const birth = dayjs(birthDate);
      const now = dayjs();
      const age = now.diff(birth, 'year');
      return age >= 0 ? age.toString() : '-';
    } catch (error) {
      return '-';
    }
  };

  // 生成今日活动时间线（整合访客记录和借用物品记录）
  const todayActivities = useMemo(() => {
    if (!selectedWorker) return [];
    
    const today = dayjs().startOf('day');
    const activities: Array<{ time: string; event: string; detail?: string; color?: string; type: string }> = [];

    // 添加访客记录活动
    visitorRecords.forEach(record => {
      if (record.checkInTime && dayjs(record.checkInTime).isSame(today, 'day')) {
        activities.push({
          time: dayjs(record.checkInTime).format('HH:mm'),
          event: t('visitorRecords.checkInTime'),
          detail: `${t('visitorRecords.idType')}: ${record.idType}`,
          color: 'green',
          type: 'visitor'
        });
      }
      if (record.checkOutTime && dayjs(record.checkOutTime).isSame(today, 'day')) {
        activities.push({
          time: dayjs(record.checkOutTime).format('HH:mm'),
          event: t('visitorRecords.checkOutTime'),
          detail: record.registrar?.name ? `${t('visitorRecords.registrar')}: ${record.registrar.name}` : undefined,
          color: 'blue',
          type: 'visitor'
        });
      }
    });

    // 添加借用物品记录活动
    borrowRecords.forEach(record => {
      if (record.borrowDate && dayjs(record.borrowDate).isSame(today, 'day')) {
        activities.push({
          time: record.borrowTime || dayjs(record.borrowDate).format('HH:mm'),
          event: t('guard.borrowItem'),
          detail: record.item?.name ? `${t('borrowRecords.itemName')}: ${record.item.name}` : `编号#${record.id}`,
          color: 'orange',
          type: 'borrow'
        });
      }
      if (record.returnDate && dayjs(record.returnDate).isSame(today, 'day')) {
        activities.push({
          time: record.returnTime || dayjs(record.returnDate).format('HH:mm'),
          event: t('guard.returnItem'),
          detail: record.item?.name ? `${t('borrowRecords.itemName')}: ${record.item.name}` : `编号#${record.id}`,
          color: 'gold',
          type: 'return'
        });
      }
    });

    // 如果没有实际记录，显示提示信息
    if (activities.length === 0) {
      activities.push({ 
        time: '--:--', 
        event: t('guard.noActivitiesToday'), 
        color: 'gray',
        type: 'empty'
      });
    }

    // 按时间排序
    return activities.sort((a, b) => (a.time > b.time ? 1 : -1));
  }, [selectedWorker, visitorRecords, borrowRecords, t]);

  // 获取状态标签
  const getStatusTag = (status: string) => {
    const statusConfig = {
      ACTIVE: { color: 'green', text: t('worker.active') },
      INACTIVE: { color: 'red', text: t('worker.inactive') },
      // 兼容小写状态
      active: { color: 'green', text: t('worker.active') },
      inactive: { color: 'red', text: t('worker.inactive') }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 获取访客状态标签
  const getVisitorStatusTag = (status: string) => {
    const statusConfig = {
      ON_SITE: { color: 'green', text: t('visitorRecords.onSite') },
      LEFT: { color: 'blue', text: t('visitorRecords.left') },
      PENDING: { color: 'orange', text: t('visitorRecords.pending') }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 查看工人详情（包含访客记录和借用物品记录）
  const handleViewDetail = async (worker: Worker) => {
    setSelectedWorker(worker);
    setDetailVisible(true);
    
    // 加载访客记录和借用物品记录
    setRecordsLoading(true);
    try {
      const [visitorRecordsData, borrowRecordsData] = await Promise.all([
        apiService.getWorkerVisitorRecords(worker.id),
        apiService.getWorkerBorrowRecords(worker.id)
      ]);
      setVisitorRecords(visitorRecordsData);
      setBorrowRecords(borrowRecordsData);
    } catch (error) {
      console.error('获取工人记录失败:', error);
      // 不显示错误消息，因为详情页面仍然可以显示其他信息
    } finally {
      setRecordsLoading(false);
    }
  };

  // 获取性别标签
  const getGenderTag = (gender: string) => {
    const genderConfig = {
      MALE: { color: 'blue', text: t('worker.male') },
      FEMALE: { color: 'pink', text: t('worker.female') },
      // 兼容小写性别
      male: { color: 'blue', text: t('worker.male') },
      female: { color: 'pink', text: t('worker.female') }
    };
    
    const config = genderConfig[gender as keyof typeof genderConfig] || { color: 'default', text: gender };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 处理删除确认
  const handleDelete = (worker: Worker) => {
    Modal.confirm({
      title: t('worker.confirmDelete'),
      content: (
        <div>
          <p>{t('worker.deleteWarning')}</p>
          <p><strong>{t('worker.name')}:</strong> {worker.name}</p>
          <p><strong>{t('worker.workerId')}:</strong> {worker.workerId}</p>
        </div>
      ),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okType: 'danger',
      onOk: () => onDelete(worker.id)
    });
  };

  // 处理单个发送二维码
  const handleSendQRCode = async (worker: Worker, method: 'email' | 'whatsapp') => {
    try {
      setSendingLoading(true);
      // 模拟发送过程
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const methodText = method === 'email' ? t('guard.sendToEmail') : t('guard.sendToWhatsApp');
      message.success(t('guard.sendSuccess').replace('{name}', worker.name).replace('{method}', methodText));
    } catch (error) {
      message.error(t('guard.sendFailed'));
    } finally {
      setSendingLoading(false);
    }
  };

  // 处理批量发送二维码
  const handleBatchSendQRCode = async (method: 'email' | 'whatsapp') => {
    if (selectedRowKeys.length === 0) {
      message.warning(t('guard.pleaseSelectWorkers'));
      return;
    }

    const selectedWorkers = workers.filter(worker => selectedRowKeys.includes(worker.id));
    const methodText = method === 'email' ? t('guard.sendToEmail') : t('guard.sendToWhatsApp');

    try {
      setSendingLoading(true);
      
      // 模拟批量发送过程
      for (let i = 0; i < selectedWorkers.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        message.success(t('guard.batchSendSuccess').replace('{name}', selectedWorkers[i].name).replace('{method}', methodText).replace('{current}', (i + 1).toString()).replace('{total}', selectedWorkers.length.toString()));
      }
      
      message.success(t('guard.batchSendComplete').replace('{count}', selectedWorkers.length.toString()));
      setSelectedRowKeys([]);
    } catch (error) {
      message.error(t('guard.batchSendFailed'));
    } finally {
      setSendingLoading(false);
    }
  };

  // 表格行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
    getCheckboxProps: (record: Worker) => ({
      disabled: record.status === 'inactive', // 离职工人不可选
    }),
  };

  // 表格列定义
  const columns = [
    {
      title: t('worker.workerId'),
      dataIndex: 'workerId',
      key: 'workerId',
      width: 120,
      fixed: 'left' as const,
      sorter: (a: Worker, b: Worker) => a.workerId.localeCompare(b.workerId),
    },
    {
      title: t('worker.name'),
      dataIndex: 'name',
      key: 'name',
      width: 100,
      fixed: 'left' as const,
      sorter: (a: Worker, b: Worker) => a.name.localeCompare(b.name),
      render: (name: string, record: Worker) => name,
    },
    {
      title: t('worker.gender'),
      dataIndex: 'gender',
      key: 'gender',
      width: 80,
      sorter: (a: Worker, b: Worker) => a.gender.localeCompare(b.gender),
      render: (gender: string) => getGenderTag(gender),
    },
    {
      title: t('worker.birthDate'),
      dataIndex: 'birthDate',
      key: 'birthDate',
      width: 120,
      sorter: (a: Worker, b: Worker) => (a.birthDate || '').localeCompare(b.birthDate || ''),
      render: (d?: string) => {
        if (!d) return '-';
        try {
          return dayjs(d).format('YYYY-MM-DD');
        } catch (error) {
          return d;
        }
      },
    },
    {
      title: t('worker.age'),
      dataIndex: 'age',
      key: 'age',
      width: 80,
      sorter: (a: Worker, b: Worker) => {
        const ageA = calculateAge(a.birthDate);
        const ageB = calculateAge(b.birthDate);
        if (ageA === '-' && ageB === '-') return 0;
        if (ageA === '-') return 1;
        if (ageB === '-') return -1;
        const numA = parseInt(ageA);
        const numB = parseInt(ageB);
        return numA - numB;
      },
      render: (_, record: Worker) => calculateAge(record.birthDate),
    },
    {
      title: t('worker.idType'),
      dataIndex: 'idType',
      key: 'idType',
      width: 120,
      render: (idType: string) => {
        const typeMap: Record<string, string> = {
          'ID_CARD': t('worker.idCard'),
          'PASSPORT': t('worker.passport'),
          'DRIVER_LICENSE': t('worker.driverLicense'),
          'OTHER': t('worker.other')
        };
        return typeMap[idType] || idType;
      },
    },
    {
      title: t('worker.idNumber'),
      dataIndex: 'idNumber',
      key: 'idNumber',
      width: 180,
      sorter: (a: Worker, b: Worker) => a.idNumber.localeCompare(b.idNumber),
    },
    {
      title: t('worker.region'),
      dataIndex: 'region',
      key: 'region',
      width: 100,
      sorter: (a: Worker, b: Worker) => a.region.localeCompare(b.region),
    },
    {
      title: t('worker.distributor'),
      dataIndex: 'distributorId',
      key: 'distributorId',
      width: 120,
      sorter: (a: Worker, b: Worker) => getDistributorName(a.distributorId).localeCompare(getDistributorName(b.distributorId)),
      render: (distributorId: string) => getDistributorName(distributorId),
    },
    // 隐藏所属工地字段
    // {
    //   title: t('worker.site'),
    //   dataIndex: 'siteId',
    //   key: 'siteId',
    //   width: 120,
    //   render: (siteId: string) => getSiteName(siteId),
    // },
    {
      title: t('worker.phone'),
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
      sorter: (a: Worker, b: Worker) => a.phone.localeCompare(b.phone),
    },
    {
      title: t('worker.email'),
      dataIndex: 'email',
      key: 'email',
      width: 180,
      sorter: (a: Worker, b: Worker) => a.email.localeCompare(b.email),
    },
    {
      title: t('worker.whatsapp'),
      dataIndex: 'whatsapp',
      key: 'whatsapp',
      width: 130,
      sorter: (a: Worker, b: Worker) => (a.whatsapp || '').localeCompare(b.whatsapp || ''),
      render: (whatsapp: string) => {
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
      },
    },
    {
      title: t('worker.status'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      sorter: (a: Worker, b: Worker) => a.status.localeCompare(b.status),
      render: (status: string) => getStatusTag(status),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: Worker) => (
        <Space size="small">
          <Tooltip title={t('common.view')}>
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          <Tooltip title={t('qrcode.title')}>
            <Button
              type="text"
              size="small"
              icon={<QrcodeOutlined />}
              onClick={() => onViewQR(record)}
            />
          </Tooltip>
          <Tooltip title={t('guard.sendToEmail')}>
            <Button
              type="text"
              size="small"
              icon={<MailOutlined />}
              onClick={() => handleSendQRCode(record, 'email')}
              loading={sendingLoading}
            />
          </Tooltip>
          <Tooltip title={t('guard.sendToWhatsApp')}>
            <Button
              type="text"
              size="small"
              icon={<WhatsAppOutlined />}
              onClick={() => handleSendQRCode(record, 'whatsapp')}
              loading={sendingLoading}
            />
          </Tooltip>
          <Tooltip title={t('common.edit')}>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit(record)}
            />
          </Tooltip>
          <Tooltip title={t('common.delete')}>
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              danger
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <>
      {/* 批量操作工具栏 */}
      {selectedRowKeys.length > 0 && (
        <div style={{ 
          marginBottom: 16, 
          padding: '12px 16px', 
          backgroundColor: '#f6ffed', 
          border: '1px solid #b7eb8f',
          borderRadius: '6px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>
            {t('worker.selectedWorkers').replace('{count}', selectedRowKeys.length.toString())}
          </span>
          <Space>
            <Button
              type="primary"
              icon={<MailOutlined />}
              onClick={() => handleBatchSendQRCode('email')}
              loading={sendingLoading}
            >
              {t('worker.batchSendToEmail')} ({selectedRowKeys.length})
            </Button>
            <Button
              type="primary"
              icon={<WhatsAppOutlined />}
              onClick={() => handleBatchSendQRCode('whatsapp')}
              loading={sendingLoading}
            >
              {t('worker.batchSendToWhatsApp')} ({selectedRowKeys.length})
            </Button>
            <Button
              onClick={() => setSelectedRowKeys([])}
            >
              {t('worker.cancelSelection')}
            </Button>
          </Space>
        </div>
      )}

      <Table
        rowSelection={rowSelection}
        columns={columns}
        dataSource={workers}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1800 }}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            t('pagination.showTotal').replace('{start}', range[0].toString()).replace('{end}', range[1].toString()).replace('{total}', total.toString()),
          pageSizeOptions: ['10', '20', '50', '100'],
          defaultPageSize: 20,
        }}
        size="middle"
        style={{ fontSize: '14px' }}
      />

      {/* 工人详情模态框 */}
      <Modal
        title={t('worker.workerDetails')}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            {t('common.close')}
          </Button>
        ]}
        width={600}
      >
        {selectedWorker && (
          <div>
            <Row gutter={16}>
              <Col span={12}>
                <p><strong>{t('worker.workerId')}:</strong> {selectedWorker.workerId}</p>
                <p><strong>{t('worker.name')}:</strong> {selectedWorker.name}</p>
                <p><strong>{t('worker.gender')}:</strong> {getGenderTag(selectedWorker.gender)}</p>
                <p><strong>{t('worker.idType')}:</strong> {
                  selectedWorker.idType === 'ID_CARD' ? t('worker.idCard') :
                  selectedWorker.idType === 'PASSPORT' ? t('worker.passport') :
                  selectedWorker.idType === 'DRIVER_LICENSE' ? t('worker.driverLicense') :
                  t('worker.other')
                }</p>
                <p><strong>{t('worker.idNumber')}:</strong> {selectedWorker.idNumber}</p>
                <p><strong>{t('worker.birthDate')}:</strong> {selectedWorker.birthDate ? dayjs(selectedWorker.birthDate).format('YYYY-MM-DD') : '-'}</p>
                <p><strong>{t('worker.age')}:</strong> {calculateAge(selectedWorker.birthDate)}</p>
              </Col>
              <Col span={12}>
                <p><strong>{t('worker.distributor')}:</strong> {getDistributorName(selectedWorker.distributorId)}</p>
                <p><strong>{t('worker.site')}:</strong> {getSiteName(selectedWorker.siteId)}</p>
                <p><strong>{t('worker.phone')}:</strong> {selectedWorker.phone}</p>
                <p><strong>{t('worker.email')}:</strong> {selectedWorker.email}</p>
                <p><strong>{t('worker.whatsapp')}:</strong> {selectedWorker.whatsapp}</p>
                <p><strong>{t('worker.status')}:</strong> {getStatusTag(selectedWorker.status)}</p>
              </Col>
            </Row>
            <Divider />
            
            {/* 今日活动时间线 */}
            <div>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>{t('guard.todayActivities')}</p>
              {recordsLoading ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div>加载中...</div>
                </div>
              ) : (
                <Timeline
                  items={todayActivities.map(a => ({
                    color: a.color,
                    children: (
                      <div>
                        <span style={{ color: '#8c8c8c', marginRight: 8 }}>{a.time}</span>
                        <span style={{ fontWeight: 500 }}>{a.event}</span>
                        {a.detail ? <span style={{ color: '#8c8c8c' }}>（{a.detail}）</span> : null}
                      </div>
                    )
                  }))}
                />
              )}
            </div>

            {/* 访客记录统计 */}
            {visitorRecords.length > 0 && (
              <>
                <Divider />
                <div>
                  <p style={{ fontWeight: 600, marginBottom: 12 }}>{t('visitorRecords.title')}</p>
                  <Row gutter={16}>
                    <Col span={8}>
                      <Card size="small">
                        <Statistic
                          title="总记录数"
                          value={visitorRecords.length}
                          valueStyle={{ color: '#1890ff' }}
                        />
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card size="small">
                        <Statistic
                          title="在场记录"
                          value={visitorRecords.filter(r => r.status === 'ON_SITE').length}
                          valueStyle={{ color: '#52c41a' }}
                        />
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card size="small">
                        <Statistic
                          title="已离场记录"
                          value={visitorRecords.filter(r => r.status === 'LEFT').length}
                          valueStyle={{ color: '#1890ff' }}
                        />
                      </Card>
                    </Col>
                  </Row>
                </div>
              </>
            )}

            {/* 借用物品记录统计 */}
            {borrowRecords.length > 0 && (
              <>
                <Divider />
                <div>
                  <p style={{ fontWeight: 600, marginBottom: 12 }}>{t('borrowRecords.title')}</p>
                  <Row gutter={16}>
                    <Col span={8}>
                      <Card size="small">
                        <Statistic
                          title={t('borrowRecords.totalBorrowed')}
                          value={borrowRecords.length}
                          valueStyle={{ color: '#1890ff' }}
                        />
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card size="small">
                        <Statistic
                          title={t('borrowRecords.returned')}
                          value={borrowRecords.filter(r => r.status === 'RETURNED').length}
                          valueStyle={{ color: '#52c41a' }}
                        />
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card size="small">
                        <Statistic
                          title={t('borrowRecords.notReturned')}
                          value={borrowRecords.filter(r => r.status === 'BORROWED').length}
                          valueStyle={{ color: '#ff4d4f' }}
                        />
                      </Card>
                    </Col>
                  </Row>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </>
  );
};

export default WorkerTable;
