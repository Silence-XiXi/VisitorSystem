import React, { useState } from 'react';
import { Table, Button, Space, Avatar, Modal, Tag, Tooltip, Row, Col, message, Timeline, Divider } from 'antd';
import { EditOutlined, DeleteOutlined, QrcodeOutlined, EyeOutlined, UserOutlined, MailOutlined, WhatsAppOutlined } from '@ant-design/icons';
import { Worker, Distributor, Site } from '../types/worker';
import dayjs from 'dayjs';
import { useLocale } from '../contexts/LocaleContext';

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

  // 生成当日活动（示例：上班 -> 借物 -> 还物/下班）
  const getTodayActivities = (worker: Worker) => {
    const base = dayjs().startOf('day');
    const activities: Array<{ time: string; event: string; detail?: string; color?: string }> = [];

    // 上班
    activities.push({ time: base.add(8, 'hour').add(Math.floor(Math.random() * 30), 'minute').format('HH:mm'), event: '上班打卡', color: 'green' });
    // 借用物品 0-2 次
    const borrowTimes = Math.floor(Math.random() * 3);
    for (let i = 0; i < borrowTimes; i++) {
      activities.push({
        time: base.add(9 + i * 2, 'hour').add(Math.floor(Math.random() * 50), 'minute').format('HH:mm'),
        event: '借用物品',
        detail: `编号#${Math.floor(Math.random() * 9000) + 1000}`,
        color: 'blue'
      });
    }
    // 可能的还物
    if (borrowTimes > 0) {
      activities.push({ time: base.add(16, 'hour').add(Math.floor(Math.random() * 40), 'minute').format('HH:mm'), event: '归还物品', color: 'gold' });
    }
    // 下班（有时未下班，用状态体现，这里默认有）
    activities.push({ time: base.add(17, 'hour').add(Math.floor(Math.random() * 50), 'minute').format('HH:mm'), event: '下班打卡', color: 'gray' });

    // 按时间排序
    return activities.sort((a, b) => (a.time > b.time ? 1 : -1));
  };

  // 获取状态标签
  const getStatusTag = (status: string) => {
    const statusConfig = {
      active: { color: 'green', text: t('worker.active') },
      suspended: { color: 'orange', text: t('worker.suspended') },
      inactive: { color: 'red', text: t('worker.inactive') }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 获取性别标签
  const getGenderTag = (gender: string) => {
    const genderConfig = {
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

  // 处理查看详情
  const handleViewDetail = (worker: Worker) => {
    setSelectedWorker(worker);
    setDetailVisible(true);
  };

  // 处理单个发送二维码
  const handleSendQRCode = async (worker: Worker, method: 'email' | 'whatsapp') => {
    try {
      setSendingLoading(true);
      // 模拟发送过程
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const methodText = method === 'email' ? '邮箱' : 'WhatsApp';
      message.success(`已成功发送二维码到 ${worker.name} 的${methodText}`);
    } catch (error) {
      message.error('发送失败，请重试');
    } finally {
      setSendingLoading(false);
    }
  };

  // 处理批量发送二维码
  const handleBatchSendQRCode = async (method: 'email' | 'whatsapp') => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要发送的工人');
      return;
    }

    const selectedWorkers = workers.filter(worker => selectedRowKeys.includes(worker.id));
    const methodText = method === 'email' ? '邮箱' : 'WhatsApp';

    try {
      setSendingLoading(true);
      
      // 模拟批量发送过程
      for (let i = 0; i < selectedWorkers.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        message.success(`已发送到 ${selectedWorkers[i].name} 的${methodText} (${i + 1}/${selectedWorkers.length})`);
      }
      
      message.success(`批量发送完成！共发送 ${selectedWorkers.length} 个工人`);
      setSelectedRowKeys([]);
    } catch (error) {
      message.error('批量发送失败，请重试');
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
      render: (name: string, record: Worker) => (
        <Space>
          <Avatar 
            size="small" 
            icon={<UserOutlined />} 
            src={record.photo}
          />
          {name}
        </Space>
      ),
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
      render: (d?: string) => d || '-',
    },
    {
      title: t('worker.age'),
      dataIndex: 'age',
      key: 'age',
      width: 80,
      sorter: (a: Worker, b: Worker) => (a.age || 0) - (b.age || 0),
      render: (age?: number) => (typeof age === 'number' ? age : '-'),
    },
    {
      title: t('worker.idCard'),
      dataIndex: 'idCard',
      key: 'idCard',
      width: 180,
      sorter: (a: Worker, b: Worker) => a.idCard.localeCompare(b.idCard),
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
      title: '状态',
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
          <Tooltip title="发送到邮箱">
            <Button
              type="text"
              size="small"
              icon={<MailOutlined />}
              onClick={() => handleSendQRCode(record, 'email')}
              loading={sendingLoading}
            />
          </Tooltip>
          <Tooltip title="发送到WhatsApp">
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
            已选择 <strong>{selectedRowKeys.length}</strong> 个工人
          </span>
          <Space>
            <Button
              type="primary"
              icon={<MailOutlined />}
              onClick={() => handleBatchSendQRCode('email')}
              loading={sendingLoading}
            >
              批量发送到邮箱 ({selectedRowKeys.length})
            </Button>
            <Button
              type="primary"
              icon={<WhatsAppOutlined />}
              onClick={() => handleBatchSendQRCode('whatsapp')}
              loading={sendingLoading}
            >
              批量发送到WhatsApp ({selectedRowKeys.length})
            </Button>
            <Button
              onClick={() => setSelectedRowKeys([])}
            >
              取消选择
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
                <p><strong>{t('worker.birthDate')}:</strong> {selectedWorker.birthDate || '-'}</p>
                <p><strong>{t('worker.age')}:</strong> {typeof selectedWorker.age === 'number' ? selectedWorker.age : '-'}</p>
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
            <div>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>当日活动</p>
              <Timeline
                items={getTodayActivities(selectedWorker).map(a => ({
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
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default WorkerTable;
