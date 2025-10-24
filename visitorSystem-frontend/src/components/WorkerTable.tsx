import React, { useState, useMemo } from 'react';
import { Table, Button, Space, Modal, Tag, Row, Col, message, Timeline, Divider, Card, Statistic, Pagination } from 'antd';
import { EditOutlined, DeleteOutlined, QrcodeOutlined, EyeOutlined, StopOutlined, CheckCircleOutlined, MailOutlined, WhatsAppOutlined } from '@ant-design/icons';
import { Worker, Distributor, Site } from '../types/worker';
import { VisitorRecord } from '../services/api';
import dayjs from '../utils/dayjs';
import { useLocale } from '../contexts/LocaleContext';
import EmailProgressModal from './EmailProgressModal';
import WhatsAppProgressModal from './WhatsAppProgressModal';
import apiService from '../services/api';



interface WorkerTableProps {
  workers: Worker[];
  distributors: Distributor[];
  sites: Site[];
  onEdit: (worker: Worker) => void;
  onDelete: (id: string) => void;
  onViewQR: (worker: Worker) => void;
  onToggleStatus?: (worker: Worker) => void;
  onBatchUpdateStatus?: (workers: Worker[], targetStatus: 'ACTIVE' | 'INACTIVE') => Promise<void>;
  loading?: boolean;
}

const WorkerTable: React.FC<WorkerTableProps> = ({
  workers,
  distributors,
  sites,
  onEdit,
  onDelete,
  onViewQR,
  onToggleStatus,
  onBatchUpdateStatus,
  loading = false
}) => {
  const { t } = useLocale();
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  // 邮件进度监控相关状态
  const [emailProgressVisible, setEmailProgressVisible] = useState(false);
  const [currentEmailJobId, setCurrentEmailJobId] = useState<string | null>(null);
  
  // WhatsApp进度监控相关状态
  const [whatsappProgressVisible, setWhatsappProgressVisible] = useState(false);
  const [currentWhatsAppJobId, setCurrentWhatsAppJobId] = useState<string | null>(null);
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // 访客记录和借用物品记录相关状态
  const [visitorRecords, setVisitorRecords] = useState<VisitorRecord[]>([]);
  const [borrowRecords, setBorrowRecords] = useState<any[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  // 批量修改状态相关状态
  const [batchUpdateStatusModalOpen, setBatchUpdateStatusModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'ACTIVE' | 'INACTIVE' | ''>('');

  // 分页数据处理
  const paginatedWorkers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return workers.slice(startIndex, endIndex);
  }, [workers, currentPage, pageSize]);

  // 分页变化处理
  const handlePageChange = (page: number, size?: number) => {
    setCurrentPage(page);
    if (size) {
      setPageSize(size);
    }
    // 保持选择状态，支持跨页多选
  };

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
          detail: record.item?.name ? `${t('borrowRecords.itemName')}: ${record.item.name}` : t('worker.itemNumber', { id: record.id }),
          color: 'orange',
          type: 'borrow'
        });
      }
      if (record.returnDate && dayjs(record.returnDate).isSame(today, 'day')) {
        activities.push({
          time: record.returnTime || dayjs(record.returnDate).format('HH:mm'),
          event: t('guard.returnItem'),
          detail: record.item?.name ? `${t('borrowRecords.itemName')}: ${record.item.name}` : t('worker.itemNumber', { id: record.id }),
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
      console.error(t('worker.getWorkerRecordsFailed'), error);
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

  // 批量删除工人
  const handleBatchDeleteWorkers = () => {
    if (selectedRowKeys.length === 0) {
      message.warning(t('worker.pleaseSelectWorkersToDelete'));
      return;
    }

    Modal.confirm({
      title: t('worker.batchDeleteTitle'),
      icon: <DeleteOutlined />,
      content: (
        <div>
          <p>{t('worker.batchDeleteContent').replace('{count}', selectedRowKeys.length.toString())}</p>
          <p style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '8px' }}>
            {t('worker.batchDeleteWarning')}
          </p>
        </div>
      ),
      okText: t('worker.batchDeleteConfirm'),
      cancelText: t('common.cancel'),
      okType: 'danger',
      onOk: async () => {
        try {
          const deletePromises = selectedRowKeys.map(workerId => 
            onDelete(workerId as string)
          );
          await Promise.all(deletePromises);
          
          setSelectedRowKeys([]);
          message.success(t('worker.batchDeleteSuccess').replace('{count}', selectedRowKeys.length.toString()));
        } catch (error: any) {
          console.error('批量删除失败:', error);
          let errorMessage = t('worker.batchDeleteFailed');
          
          if (error?.response?.data?.message) {
            errorMessage = error.response.data.message;
          } else if (error?.message) {
            errorMessage = error.message;
          }
          
          message.error(errorMessage);
        }
      }
    });
  };

  // 批量修改状态
  const handleBatchUpdateStatus = () => {
    if (selectedRowKeys.length === 0) {
      message.warning(t('worker.pleaseSelectWorkersToUpdate'));
      return;
    }
    setBatchUpdateStatusModalOpen(true);
  };

  // 确认批量修改状态
  const handleConfirmBatchUpdateStatus = async () => {
    if (!selectedStatus) {
      message.warning(t('worker.pleaseSelectStatus'));
      return;
    }

    try {
      const selectedWorkers = workers.filter(worker => selectedRowKeys.includes(worker.id));
      
      // 转换状态格式进行比较：selectedStatus是大写(ACTIVE/INACTIVE)，worker.status是小写(active/inactive)
      const targetStatus = selectedStatus === 'ACTIVE' ? 'active' : 'inactive';
      
      // 只对状态不匹配的工人进行更新
      const workersToUpdate = selectedWorkers.filter(worker => worker.status !== targetStatus);
      
      if (workersToUpdate.length === 0) {
        message.info(t('worker.allWorkersAlreadyInSelectedStatus'));
        setSelectedRowKeys([]);
        setBatchUpdateStatusModalOpen(false);
        setSelectedStatus('');
        return;
      }
      
      // 使用批量更新状态回调，这样可以同时更新本地状态
      if (onBatchUpdateStatus) {
        await onBatchUpdateStatus(workersToUpdate, selectedStatus);
      } else {
        // 如果没有批量更新回调，回退到单个更新
        const updatePromises = workersToUpdate.map(async worker => {
          if (onToggleStatus) {
            return onToggleStatus(worker);
          }
          return Promise.resolve();
        });
        
        await Promise.all(updatePromises);
      }
      
      setSelectedRowKeys([]);
      setBatchUpdateStatusModalOpen(false);
      setSelectedStatus('');
      message.success(t('worker.batchUpdateStatusSuccess').replace('{count}', workersToUpdate.length.toString()));
    } catch (error: any) {
      console.error('批量修改状态失败:', error);
      let errorMessage = t('worker.batchUpdateStatusFailed');
      
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      message.error(errorMessage);
    }
  };

  // 异步批量发送二维码邮件
  const handleAsyncBatchSendQRCode = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning(t('messages.pleaseSelectWorkersToSend'));
      return;
    }

    const selectedWorkers = workers.filter(worker => selectedRowKeys.includes(worker.id));
    
    // 自动跳过没有邮箱的工人，只处理有邮箱的工人
    const workersWithEmail = selectedWorkers.filter(w => w.email);
    const workersWithoutEmail = selectedWorkers.filter(w => !w.email);
    
    // 如果没有有效的邮箱地址，显示警告并返回
    if (workersWithEmail.length === 0) {
      message.warning(t('messages.noValidEmailWarning'));
      return;
    }
    
    // 如果有部分工人没有邮箱，显示提示信息
    if (workersWithoutEmail.length > 0) {
      message.info(t('messages.skippedWorkersWithoutEmail', { 
        skipped: workersWithoutEmail.length.toString(),
        total: selectedWorkers.length.toString(),
        valid: workersWithEmail.length.toString()
      }));
    }

    try {
      // 生成二维码并准备批量发送数据
      const workerDataPromises = workersWithEmail.map(async worker => {
        try {
          // 获取工人的二维码数据
          const qrCodeData = await apiService.generateQRCodeByWorkerId(worker.workerId);
          if (!qrCodeData || !qrCodeData.qrCodeDataUrl) {
            throw new Error(t('qrcode.generateFailed'));
          }
          
          return {
            workerEmail: worker.email,
            workerName: worker.name,
            workerId: worker.workerId,
            qrCodeDataUrl: qrCodeData.qrCodeDataUrl
          };
        } catch (err) {
          console.error(t('worker.generateQRCodeFailed', { name: worker.name }), err);
          return null;
        }
      });

      // 等待所有二维码生成完成
      const workerDataResults = await Promise.all(workerDataPromises);
      const validWorkerData = workerDataResults.filter(data => data !== null);

      if (validWorkerData.length === 0) {
        message.error(t('messages.allGenerationFailed'));
        return;
      }

      // 获取当前的语言设置
      const currentLocale = localStorage.getItem('locale') || 'zh-CN';

      // 创建异步邮件发送任务
      const result = await apiService.asyncBatchSendQRCodeEmail({
        workers: validWorkerData,
        language: currentLocale
      });

      if (result.success) {
        message.success(t('common.emailTaskCreated', { count: validWorkerData.length.toString() }));
        
        // 显示进度监控
        setCurrentEmailJobId(result.jobId);
        setEmailProgressVisible(true);
        
        // 清空选择
        setSelectedRowKeys([]);
      } else {
        message.error(t('common.emailTaskCreateFailed'));
      }
    } catch (error: any) {
      console.error('异步批量发送二维码邮件失败:', error);
      message.error(t('common.emailTaskCreateFailed') + ': ' + (error.message || '未知错误'));
    }
  };

  // 邮件任务完成回调
  const handleEmailTaskComplete = () => {
    // 不立即关闭进度监控弹窗，让结果弹窗先显示
    // setEmailProgressVisible(false);
    // setCurrentEmailJobId(null);
    
    // 注释掉原有的消息提示，因为现在有结果弹窗
    // 原有的消息提示逻辑已移除，现在由结果弹窗处理
  };

  // 处理重新发送失败的邮件
  const handleRetryFailedEmails = (failedEmails: Array<{ email: string; error: string }>) => {
    // 从失败的邮件中提取工人信息，重新发送
    const failedWorkerIds = failedEmails.map(failed => {
      // 根据邮箱地址找到对应的工人ID
      const worker = workers.find(w => w.email === failed.email);
      return worker?.workerId;
    }).filter(Boolean);

    if (failedWorkerIds.length > 0) {
      // 重新发送这些工人的二维码
      handleAsyncBatchSendQRCode();
    }
  };

  // 异步批量发送二维码到WhatsApp
  const handleAsyncBatchSendQRCodeWhatsApp = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning(t('messages.pleaseSelectWorkersToSend'));
      return;
    }

    const selectedWorkers = workers.filter(worker => selectedRowKeys.includes(worker.id));
    
    // 自动跳过没有WhatsApp的工人，只处理有WhatsApp的工人
    const workersWithWhatsApp = selectedWorkers.filter(w => w.whatsapp);
    const workersWithoutWhatsApp = selectedWorkers.filter(w => !w.whatsapp);
    
    // 如果没有有效的WhatsApp号码，显示警告并返回
    if (workersWithWhatsApp.length === 0) {
      message.warning(t('messages.noValidWhatsappWarning'));
      return;
    }
    
    // 如果有部分工人没有WhatsApp，显示提示信息
    if (workersWithoutWhatsApp.length > 0) {
      message.info(t('messages.skippedWorkersWithoutWhatsApp', { 
        skipped: workersWithoutWhatsApp.length.toString(),
        total: selectedWorkers.length.toString(),
        valid: workersWithWhatsApp.length.toString()
      }));
    }

    try {
      // 生成二维码并准备批量发送数据
      const workerDataPromises = workersWithWhatsApp.map(async worker => {
        try {
          // 获取工人的二维码数据
          const qrCodeData = await apiService.generateQRCodeByWorkerId(worker.workerId);
          if (!qrCodeData || !qrCodeData.qrCodeDataUrl) {
            throw new Error(t('qrcode.generateFailed'));
          }
          
          return {
            workerWhatsApp: worker.whatsapp.replace(/\s+/g, ''), // 去除所有空格
            workerName: worker.name,
            workerId: worker.workerId,
            qrCodeDataUrl: qrCodeData.qrCodeDataUrl
          };
        } catch (err) {
          console.error(t('worker.generateQRCodeFailed', { name: worker.name }), err);
          return null;
        }
      });

      // 等待所有二维码生成完成
      const workerDataResults = await Promise.all(workerDataPromises);
      const validWorkerData = workerDataResults.filter(data => data !== null);

      if (validWorkerData.length === 0) {
        message.error(t('messages.allGenerationFailed'));
        return;
      }

      // 获取当前的语言设置
      const currentLocale = localStorage.getItem('locale') || 'zh-CN';

      // 创建异步WhatsApp发送任务
      const result = await apiService.asyncBatchSendQRCodeWhatsApp({
        workers: validWorkerData,
        language: currentLocale
      });

      if (result.success) {
        message.success(t('common.whatsappTaskCreated', { count: validWorkerData.length.toString() }));
        
        // 显示进度监控
        setCurrentWhatsAppJobId(result.jobId);
        setWhatsappProgressVisible(true);
        
        // 清空选择
        setSelectedRowKeys([]);
      } else {
        message.error(t('common.whatsappTaskCreateFailed'));
      }
    } catch (error: any) {
      console.error('异步批量发送WhatsApp失败:', error);
      message.error(t('common.whatsappTaskCreateFailed') + ': ' + (error.message || '未知错误'));
    }
  };

  // WhatsApp任务完成回调
  const handleWhatsAppTaskComplete = () => {
    // 不立即关闭进度监控弹窗，让结果弹窗先显示
    // setWhatsappProgressVisible(false);
    // setCurrentWhatsAppJobId(null);
    
    // 注释掉原有的消息提示，因为现在有结果弹窗
    // 原有的消息提示逻辑已移除，现在由结果弹窗处理
  };

  // 处理重新发送失败的WhatsApp
  const handleRetryFailedWhatsApps = (failedWhatsApps: Array<{ whatsapp: string; error: string }>) => {
    // 从失败的WhatsApp中提取工人信息，重新发送
    const failedWorkerIds = failedWhatsApps.map(failed => {
      // 根据WhatsApp号码找到对应的工人ID
      const worker = workers.find(w => w.whatsapp === failed.whatsapp);
      return worker?.workerId;
    }).filter(Boolean);

    if (failedWorkerIds.length > 0) {
      // 重新发送这些工人的二维码
      handleAsyncBatchSendQRCodeWhatsApp();
    }
  };


  // 表格行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
    preserveSelectedRowKeys: true,
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
      width: 100,
      fixed: 'left' as const,
      sorter: (a: Worker, b: Worker) => a.workerId.localeCompare(b.workerId),
    },
    {
      title: t('worker.name'),
      dataIndex: 'name',
      key: 'name',
      width: 120,
      fixed: 'left' as const,
      sorter: (a: Worker, b: Worker) => a.name.localeCompare(b.name),
      render: (name: string) => name,
    },
    {
      title: t('worker.gender'),
      dataIndex: 'gender',
      key: 'gender',
      width: 75,
      sorter: (a: Worker, b: Worker) => a.gender.localeCompare(b.gender),
      render: (gender: string) => getGenderTag(gender),
    },
    {
      title: t('worker.birthDate'),
      dataIndex: 'birthDate',
      key: 'birthDate',
      width: 110,
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
      width: 60,
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
      render: (_: unknown, record: Worker) => calculateAge(record.birthDate),
    },
    {
      title: t('worker.idType'),
      dataIndex: 'idType',
      key: 'idType',
      width: 80,
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
      width: 110,
      sorter: (a: Worker, b: Worker) => a.region.localeCompare(b.region),
      render: (region: string) => {
        const areaCodeMap: Record<string, string> = {
          '+86': t('distributor.areaCodeChina'),
          '+852': t('distributor.areaCodeHongKong'),
          '+853': t('distributor.areaCodeMacau'),
          '+886': t('distributor.areaCodeTaiwan'),
          '+65': t('distributor.areaCodeSingapore'),
          '+60': t('distributor.areaCodeMalaysia'),
          '+66': t('distributor.areaCodeThailand'),
          '+63': t('distributor.areaCodePhilippines'),
          '+62': t('distributor.areaCodeIndonesia'),
          '+84': t('distributor.areaCodeVietnam'),
          '+1': t('distributor.areaCodeUSCanada'),
          '+44': t('distributor.areaCodeUK'),
          '+49': t('distributor.areaCodeGermany'),
          '+33': t('distributor.areaCodeFrance'),
          '+81': t('distributor.areaCodeJapan'),
          '+82': t('distributor.areaCodeKorea'),
          '+91': t('distributor.areaCodeIndia'),
          '+61': t('distributor.areaCodeAustralia'),
        }
        
        // 如果传入的是区号，返回对应的地区名称
        if (areaCodeMap[region]) {
          return areaCodeMap[region]
        }
        
        // 如果传入的是旧的地区名称，尝试反向映射
        const reverseMap: Record<string, string> = {
          [t('regions.mainland')]: t('distributor.areaCodeChina'),
          [t('regions.hongkong')]: t('distributor.areaCodeHongKong'),
          [t('regions.macau')]: t('distributor.areaCodeMacau'),
          [t('regions.taiwan')]: t('distributor.areaCodeTaiwan'),
        }
        
        return reverseMap[region] || region || '-'
      }
    },
    {
      title: t('worker.distributor'),
      dataIndex: 'distributorId',
      key: 'distributorId',
      width: 122,
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
      width: 110,
      sorter: (a: Worker, b: Worker) => a.phone.localeCompare(b.phone),
    },
    {
      title: t('worker.email'),
      dataIndex: 'email',
      key: 'email',
      width: 220,
      sorter: (a: Worker, b: Worker) => a.email.localeCompare(b.email),
    },
    {
      title: t('worker.whatsapp'),
      dataIndex: 'whatsapp',
      key: 'whatsapp',
      width: 130,
      sorter: (a: Worker, b: Worker) => (a.whatsapp || '').localeCompare(b.whatsapp || ''),
      render: (whatsapp: string) => {
        if (!whatsapp || whatsapp.trim() === '') return '-';
        
        // 处理WhatsApp号码显示
        const trimmedWhatsapp = whatsapp.trim();
        
        // 如果包含空格，按空格分割显示
        if (trimmedWhatsapp.includes(' ')) {
          const parts = trimmedWhatsapp.split(' ');
          if (parts.length >= 2) {
            return (
              <div style={{ lineHeight: '1.2' }}>
                <div style={{ color: '#666', fontSize: '12px' }}>{parts[0]}</div>
                <div style={{ fontSize: '13px' }}>{parts.slice(1).join(' ')}</div>
              </div>
            );
          }
        }
        
        // 如果没有空格，直接显示
        return (
          <div style={{ fontSize: '13px' }}>
            {trimmedWhatsapp}
          </div>
        );
      },
    },
    {
      title: t('worker.status'),
      dataIndex: 'status',
      key: 'status',
      width: 80,
      sorter: (a: Worker, b: Worker) => a.status.localeCompare(b.status),
      render: (status: string) => getStatusTag(status),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 160,
      fixed: 'right' as const,
      render: (_: unknown, record: Worker) => (
        <Space style={{ justifyContent: 'flex-end' }}>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
            title={t('common.view')}
          />
          <Button
            size="small"
            icon={<QrcodeOutlined />}
            onClick={() => onViewQR(record)}
            title={t('qrcode.title')}
          />
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
            title={t('common.edit')}
          />
          {onToggleStatus && (
            <Button
              size="small"
              icon={record.status?.toLowerCase() === 'active' ? <StopOutlined /> : <CheckCircleOutlined />}
              onClick={() => onToggleStatus(record)}
              title={record.status?.toLowerCase() === 'active' ? t('common.disable') : t('common.enable')}
              style={{ color: record.status?.toLowerCase() === 'active' ? '#ff4d4f' : '#52c41a' }}
            />
          )}
          <Button
            size="small"
            icon={<DeleteOutlined />}
            danger
            onClick={() => handleDelete(record)}
            title={t('common.delete')}
          />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* 批量操作工具栏 */}
      {selectedRowKeys.length > 0 && (
        <div style={{ 
          marginBottom: 1, 
          padding: '8px 16px', 
          backgroundColor: '#f6ffed', 
          border: '1px solid #b7eb8f',
          borderRadius: '4px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <span>
            {t('worker.selectedWorkers').replace('{count}', selectedRowKeys.length.toString())}
            {selectedRowKeys.length > 0 && (
              <span style={{ color: '#999', marginLeft: '8px' }}>
                / {t('worker.totalWorkers').replace('{count}', workers.length.toString())}
              </span>
            )}
          </span>
          <Space>
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />} 
              onClick={handleBatchDeleteWorkers}
            >
              {t('worker.batchDeleteWorkers')}({selectedRowKeys.length})
            </Button>
            <Button
              size="small"
              icon={<CheckCircleOutlined />} 
              onClick={handleBatchUpdateStatus}
            >
              {t('worker.batchUpdateStatus')}({selectedRowKeys.length})
            </Button>
            <Button
              type="primary"
              icon={<MailOutlined />}
              onClick={handleAsyncBatchSendQRCode}
              size="small"
            >
              {t('common.asyncBatchSendQRCodeEmail')}({selectedRowKeys.length})
            </Button>
            <Button
              type="primary"
              icon={<WhatsAppOutlined />}
              onClick={handleAsyncBatchSendQRCodeWhatsApp}
              size="small"
            >
              {t('common.asyncBatchSendQRCodeWhatsApp')} ({selectedRowKeys.length})
            </Button>
            <Button
              onClick={() => setSelectedRowKeys([])}
              size="small"
            >
              {t('worker.cancelSelection').replace('{count}', selectedRowKeys.length.toString())}
            </Button>
          </Space>
        </div>
      )}

      {/* 表格容器 */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: 0, 
        padding: '8px 16px 0 16px', // 顶部添加8px间距
        marginBottom: selectedRowKeys.length > 0 ? 0 : 0 // 根据是否有批量操作栏调整底部间距
      }}>
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={paginatedWorkers}
          rowKey="id"
          loading={loading}
          scroll={{ 
            x: 1800,
            y: selectedRowKeys.length > 0 
              ? 'calc(100vh - 348px)' // 有批量操作栏时减少高度，考虑顶部间距
              : 'calc(100vh - 308px)' // 没有批量操作栏时正常高度，考虑顶部间距
          }}
          pagination={false} // 禁用内置分页，使用自定义分页
          size="middle"
          tableLayout="fixed" // 固定表格布局，避免对齐延迟
          style={{ 
            fontSize: '14px',
            height: '100%'
          }}
          onRow={(record) => ({
            onClick: (event) => {
              // 如果点击的是复选框或复选框的父元素，不处理行点击
              const target = event.target as HTMLElement;
              if (target.closest('.ant-checkbox-wrapper') || target.closest('.ant-checkbox')) {
                return;
              }
              
              // 如果点击的是操作列中的按钮，不处理行点击
              if (target.closest('button') || target.closest('.ant-btn')) {
                return;
              }
              
              // 切换选中状态
              const isSelected = selectedRowKeys.includes(record.id);
              if (isSelected) {
                setSelectedRowKeys(prev => prev.filter(id => id !== record.id));
              } else {
                setSelectedRowKeys(prev => [...prev, record.id]);
              }
            },
            style: { cursor: 'pointer' }
          })}
        />
      </div>

      {/* 外部分页栏 */}
      <div style={{ 
        padding: '12px 16px',
        borderTop: '1px solid #f0f0f0',
        backgroundColor: '#fafafa',
        flexShrink: 0,
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center'
      }}>
        {/* 分页 */}
        <Pagination
          current={currentPage}
          pageSize={pageSize}
          total={workers.length}
          showSizeChanger
          showQuickJumper
          showTotal={(total, range) => 
            t('pagination.showTotal').replace('{start}', range[0].toString()).replace('{end}', range[1].toString()).replace('{total}', total.toString())
          }
          pageSizeOptions={['10', '20', '50', '100']}
          onChange={handlePageChange}
          onShowSizeChange={handlePageChange}
          size="small"
          style={{ 
            margin: 0
          }}
        />
      </div>

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

      {/* 批量修改状态模态框 */}
      <Modal
        title={t('worker.batchUpdateStatus')}
        open={batchUpdateStatusModalOpen}
        onCancel={() => {
          setBatchUpdateStatusModalOpen(false);
          setSelectedStatus('');
        }}
        onOk={handleConfirmBatchUpdateStatus}
        destroyOnClose
        width={500}
      >
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>{t('worker.confirmBatchUpdateStatus')}</p>
          <p style={{ color: '#666', fontSize: '16px' }}>
            {t('worker.selectedWorkers').replace('{count}', selectedRowKeys.length.toString())}
          </p>
        </div>
        <div>
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{t('worker.selectStatus')}</span>
          </div>
          <div style={{ display: 'flex', gap: '32px' }}>
            <label style={{ display: 'flex', alignItems: 'center', fontSize: '16px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="status"
                value="ACTIVE"
                checked={selectedStatus === 'ACTIVE'}
                onChange={(e) => setSelectedStatus(e.target.value as 'ACTIVE' | 'INACTIVE' | '')}
                style={{ marginRight: '8px' }}
              />
              <Tag color="green" style={{ marginRight: '8px', fontSize: '14px', padding: '4px 8px' }}>{t('worker.active')}</Tag>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', fontSize: '16px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="status"
                value="INACTIVE"
                checked={selectedStatus === 'INACTIVE'}
                onChange={(e) => setSelectedStatus(e.target.value as 'ACTIVE' | 'INACTIVE' | '')}
                style={{ marginRight: '8px' }}
              />
              <Tag color="red" style={{ marginRight: '8px', fontSize: '14px', padding: '4px 8px' }}>{t('worker.inactive')}</Tag>
            </label>
          </div>
        </div>
      </Modal>

      {/* 邮件进度监控模态框 */}
      <EmailProgressModal
        visible={emailProgressVisible}
        jobId={currentEmailJobId}
        onClose={() => {
          setEmailProgressVisible(false);
          setCurrentEmailJobId(null);
        }}
        onComplete={handleEmailTaskComplete}
        onRetryFailed={handleRetryFailedEmails}
      />

      {/* WhatsApp进度监控模态框 */}
      <WhatsAppProgressModal
        visible={whatsappProgressVisible}
        jobId={currentWhatsAppJobId}
        onClose={() => {
          setWhatsappProgressVisible(false);
          setCurrentWhatsAppJobId(null);
        }}
        onComplete={handleWhatsAppTaskComplete}
        onRetryFailed={handleRetryFailedWhatsApps}
      />
    </div>
  );
};

export default WorkerTable;
