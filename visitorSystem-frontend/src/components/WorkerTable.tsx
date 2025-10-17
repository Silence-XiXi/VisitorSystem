import React, { useState, useMemo } from 'react';
import { Table, Button, Space, Modal, Tag, Tooltip, Row, Col, message, Timeline, Divider, Card, Statistic, Pagination } from 'antd';
import { EditOutlined, DeleteOutlined, QrcodeOutlined, EyeOutlined, StopOutlined, CheckCircleOutlined, MailOutlined, WhatsAppOutlined, ReloadOutlined } from '@ant-design/icons';
import { Worker, Distributor, Site } from '../types/worker';
import { VisitorRecord } from '../services/api';
import dayjs from '../utils/dayjs';
import { useLocale } from '../contexts/LocaleContext';
import apiService from '../services/api';

// 失败项内容组件，支持选择和重新发送
interface FailedItemsContentProps {
  failedItems: Array<{
    workerId: string;
    workerName: string;
    success: boolean;
    message?: string;
  }>;
  onResend: (selectedItems: Array<{
    workerId: string;
    workerName: string;
    success: boolean;
    message?: string;
  }>) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

const FailedItemsContent: React.FC<FailedItemsContentProps> = ({ failedItems, onResend, t }) => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // 表格行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys);
    }
  };

  // 处理重新发送
  const handleResend = () => {
    if (selectedRowKeys.length === 0) {
      message.warning(t('messages.pleaseSelectItemsToResend'));
      return;
    }

    const selectedItems = failedItems.filter(item => selectedRowKeys.includes(item.workerId));
    onResend(selectedItems);
  };

  // 全选
  const handleSelectAll = () => {
    setSelectedRowKeys(failedItems.map(item => item.workerId));
  };

  // 取消全选
  const handleDeselectAll = () => {
    setSelectedRowKeys([]);
  };

  return (
    <div>
      <p>{t('worker.sendFailureExplanation')}</p>
      
      {/* 操作工具栏 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button 
            size="small" 
            onClick={handleSelectAll}
          >
            {t('worker.selectAll')}
          </Button>
          <Button 
            size="small" 
            onClick={handleDeselectAll}
          >
            {t('worker.deselectAll')}
          </Button>
        </Space>

        <Button 
          type="primary" 
          icon={<ReloadOutlined />} 
          onClick={handleResend}
          disabled={selectedRowKeys.length === 0}
        >
          {t('worker.resendSelected')} ({selectedRowKeys.length})
        </Button>
      </div>

      <Table
        rowSelection={rowSelection}
        size="small"
        dataSource={failedItems}
        columns={[
          {
            title: t('worker.workerId'),
            dataIndex: 'workerId',
            key: 'workerId',
          },
          {
            title: t('worker.name'),
            dataIndex: 'workerName',
            key: 'workerName',
          },
          {
            title: t('common.error'),
            dataIndex: 'message',
            key: 'message',
          }
        ]}
        pagination={false}
        rowKey="workerId"
      />
    </div>
  );
};


interface WorkerTableProps {
  workers: Worker[];
  distributors: Distributor[];
  sites: Site[];
  onEdit: (worker: Worker) => void;
  onDelete: (id: string) => void;
  onViewQR: (worker: Worker) => void;
  onToggleStatus?: (worker: Worker) => void;
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
  loading = false
}) => {
  const { t } = useLocale();
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [sendingEmailLoading, setSendingEmailLoading] = useState(false);
  const [sendingWhatsAppLoading, setSendingWhatsAppLoading] = useState(false);
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // 访客记录和借用物品记录相关状态
  const [visitorRecords, setVisitorRecords] = useState<VisitorRecord[]>([]);
  const [borrowRecords, setBorrowRecords] = useState<any[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

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
    // 清空选择状态
    setSelectedRowKeys([]);
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

  // 处理批量发送二维码
  const handleBatchSendQRCode = async (method: 'email' | 'whatsapp') => {
    if (selectedRowKeys.length === 0) {
      message.warning(t('messages.pleaseSelectWorkersToSend'));
      return;
    }

    const selectedWorkers = paginatedWorkers.filter(worker => selectedRowKeys.includes(worker.id));
    
    // 针对电子邮件发送处理
    if (method === 'email') {
      // 检查是否所有选中的工人都有电子邮件地址
      const workersWithoutEmail = selectedWorkers.filter(w => !w.email);
      if (workersWithoutEmail.length > 0) {
        message.warning(t('messages.noValidEmailWarning'));
        return;
      }
      
      // 显示加载中的消息
      const loadingKey = 'sendingQRCodesEmail';
      message.loading({ 
        content: t('worker.sendingQRCodes', { count: String(selectedWorkers.length) }), 
        key: loadingKey 
      });
      
      try {
        setSendingEmailLoading(true);
        
        // 生成二维码并准备批量发送数据
        const workerDataPromises = selectedWorkers.map(async worker => {
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
            console.error(`生成工人[${worker.name}]的二维码失败:`, err);
            return null;
          }
        });
        
        // 等待所有二维码生成完成
        const workerDataResults = await Promise.all(workerDataPromises);
        const validWorkerData = workerDataResults.filter(data => data !== null);
        
        if (validWorkerData.length === 0) {
          message.error({ content: t('messages.allGenerationFailed'), key: loadingKey });
          return;
        }
        
        // 获取当前的语言设置
        const currentLocale = localStorage.getItem('locale') || 'zh-CN';
        
        // 分批发送，避免请求过大
        const BATCH_SIZE = 10; // 每批10个工人
        let successCount = 0;
        let failedCount = 0;
        let allFailedItems: any[] = [];
        
        // 将工人数据分成多个批次
        const batches = [];
        for (let i = 0; i < validWorkerData.length; i += BATCH_SIZE) {
          batches.push(validWorkerData.slice(i, i + BATCH_SIZE));
        }
        
        // 显示批次信息
        message.info({ 
          content: t('worker.batchProcessingInfo', { 
            batches: String(batches.length), 
            total: String(validWorkerData.length)
          }) || `将分${batches.length}批处理${validWorkerData.length}个工人数据`,
          key: loadingKey 
        });
        
        // 逐批处理
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          
          // 更新加载消息
          message.loading({ 
            content: `处理第${i+1}/${batches.length}批 (${batch.length}个工人)`, 
            key: loadingKey 
          });
          
          // 批量发送二维码邮件
          const result = await apiService.batchSendQRCodeEmail({
            workers: batch,
            language: currentLocale
          });
          
          if (result.success) {
            // 累加成功数量
            successCount += (result.results?.succeeded || 0);
            
            // 收集失败项
            if (result.results && result.results.failed > 0) {
              const batchFailedItems = result.results.details.filter(item => !item.success);
              allFailedItems = [...allFailedItems, ...batchFailedItems];
              failedCount += result.results.failed;
            }
            
            // 更新进度消息
            message.loading({ 
              content: `已完成${i+1}/${batches.length}批，成功${successCount}个，失败${failedCount}个`, 
              key: loadingKey 
            });
          } else {
            // 整批失败
            message.error({ 
              content: `第${i+1}批发送失败: ${result.message || t('worker.batchSendFailed')}`, 
              key: loadingKey 
            });
            failedCount += batch.length;
          }
        }
        
        // 所有批次处理完毕，设置最终result为汇总结果
        const result = {
          success: true,
          results: {
            succeeded: successCount,
            failed: failedCount,
            total: validWorkerData.length,
            details: allFailedItems
          }
        };
        
        if (result.success) {
          message.success({ 
            content: t('worker.batchSendComplete', { 
              count: String(result.results?.succeeded || 0),
              total: String(result.results?.total || validWorkerData.length)
            }),
            key: loadingKey
          });
          
          // 显示详细结果
          if (result.results && result.results.failed > 0) {
            // 准备失败项数据
            const failedItems = result.results.details.filter(item => !item.success);
            
            // 创建一个可选择的Modal对话框
            const failedModal = Modal.warning({
              title: t('worker.partialSendFailure', { 
                failed: String(result.results.failed),
                total: String(result.results.total)
              }),
              content: (
                <FailedItemsContent 
                  failedItems={failedItems}
                  onResend={async (selectedItems) => {
                    // 关闭当前对话框
                    failedModal.destroy();
                    
                    // 如果没有选择任何项，直接返回
                    if (!selectedItems || selectedItems.length === 0) {
                      return;
                    }
                    
                    // 显示正在重新发送的消息
                    const resendKey = 'resendingEmails';
                    message.loading({ 
                      content: t('worker.resendingEmails', { count: String(selectedItems.length) }),
                      key: resendKey
                    });
                    
                    try {
                      // 为所选项重新生成二维码并发送
                      const selectedWorkers = workers.filter(worker => 
                        selectedItems.some(item => item.workerId === worker.workerId)
                      );
                      
                      // 生成二维码并准备批量发送数据
                      const workerDataPromises = selectedWorkers.map(async worker => {
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
                          console.error(`生成工人[${worker.name}]的二维码失败:`, err);
                          return null;
                        }
                      });
                      
                      // 等待所有二维码生成完成
                      const workerDataResults = await Promise.all(workerDataPromises);
                      const validWorkerData = workerDataResults.filter(data => data !== null);
                      
                      if (validWorkerData.length === 0) {
                        message.error({ 
                          content: t('qrcode.allGenerationFailed'), 
                          key: resendKey 
                        });
                        return;
                      }
                      
                      // 对于重发的项目也要分批处理，避免请求过大
                      const RESEND_BATCH_SIZE = 10;
                      let resendSuccessCount = 0;
                      let resendFailedCount = 0;
                      let resendFailedItems: any[] = [];
                      
                      // 将要重发的数据分批
                      const resendBatches = [];
                      for (let i = 0; i < validWorkerData.length; i += RESEND_BATCH_SIZE) {
                        resendBatches.push(validWorkerData.slice(i, i + RESEND_BATCH_SIZE));
                      }
                      
                      // 显示批次信息
                      message.info({ 
                        content: `将分${resendBatches.length}批重发${validWorkerData.length}个工人数据`,
                        key: resendKey 
                      });
                      
                      // 逐批处理重发
                      for (let i = 0; i < resendBatches.length; i++) {
                        const batch = resendBatches[i];
                        
                        // 获取当前的语言设置
                        const currentLocale = localStorage.getItem('locale') || 'zh-CN';
                        
                        // 更新重发进度
                        message.loading({ 
                          content: `重发进度: ${i+1}/${resendBatches.length}批`, 
                          key: resendKey 
                        });
                        
                        // 批量重发
                        const batchResult = await apiService.batchSendQRCodeEmail({
                          workers: batch,
                          language: currentLocale
                        });
                        
                        if (batchResult.success) {
                          resendSuccessCount += (batchResult.results?.succeeded || 0);
                          
                          if (batchResult.results && batchResult.results.failed > 0) {
                            const batchFailedItems = batchResult.results.details.filter(item => !item.success);
                            resendFailedItems = [...resendFailedItems, ...batchFailedItems];
                            resendFailedCount += batchResult.results.failed;
                          }
                        } else {
                          resendFailedCount += batch.length;
                        }
                      }
                      
                      // 所有批次处理完毕，设置最终resendResult为汇总结果
                      const resendResult = {
                        success: true,
                        results: {
                          succeeded: resendSuccessCount,
                          failed: resendFailedCount,
                          total: validWorkerData.length,
                          details: resendFailedItems
                        }
                      };
                      
                      if (resendResult.success) {
                        message.success({ 
                          content: t('worker.resendComplete', { 
                            count: String(resendResult.results?.succeeded || 0),
                            total: String(resendResult.results?.total || validWorkerData.length)
                          }),
                          key: resendKey
                        });
                        
                        // 显示详细结果
                        if (resendResult.results && resendResult.results.failed > 0) {
                          // 递归调用，显示新的失败项
                          if (resendResult.results && resendResult.results.failed > 0) {
                            const failedItems = resendResult.results.details.filter(item => !item.success);
                            
                            Modal.warning({
                              title: t('worker.resendPartialFailure', { 
                                failed: String(resendResult.results.failed),
                                total: String(resendResult.results.total)
                              }),
                              content: (
                                <div>
                                  <p>{t('worker.resendFailureExplanation')}</p>
                                  <Table
                                    size="small"
                                    dataSource={failedItems}
                                    columns={[
                                      {
                                        title: t('worker.workerId'),
                                        dataIndex: 'workerId',
                                        key: 'workerId',
                                      },
                                      {
                                        title: t('worker.name'),
                                        dataIndex: 'workerName',
                                        key: 'workerName',
                                      },
                                      {
                                        title: t('common.error'),
                                        dataIndex: 'message',
                                        key: 'message',
                                      }
                                    ]}
                                    pagination={false}
                                    rowKey="workerId"
                                  />
                                </div>
                              ),
                              okText: t('common.ok'),
                              width: 600,
                            });
                          }
                        }
                      } else {
                        message.error({ 
                          content: t('worker.resendFailed'),
                          key: resendKey
                        });
                      }
                    } catch (error) {
                      console.error('重新发送二维码邮件失败:', error);
                      message.error({ 
                        content: typeof error === 'string' ? error : t('worker.resendFailed'),
                        key: resendKey
                      });
                    }
                  }}
                  t={t}
                />
              ),
              okText: t('common.ok'),
              width: 700,
            });
          }
          
          // 批量发送成功后清除选择
          setSelectedRowKeys([]);
          } else {
            message.error({ content: t('messages.batchSendFailed'), key: loadingKey });
          }
      } catch (error) {
        console.error('批量发送二维码邮件失败:', error);
        message.error({ 
          content: typeof error === 'string' ? error : t('messages.batchSendFailed'), 
          key: loadingKey 
        });
      }       finally {
        setSendingEmailLoading(false);
      }
    } 
    // WhatsApp发送处理
    else if (method === 'whatsapp') {
      // 检查是否所有选中的工人都有WhatsApp号码
      const workersWithoutWhatsApp = selectedWorkers.filter(w => !w.whatsapp);
      if (workersWithoutWhatsApp.length > 0) {
        message.warning(t('messages.noValidWhatsappWarning'));
        return;
      }
      
      // 显示加载中的消息
      const loadingKey = 'sendingQRCodesWhatsApp';
      message.loading({ 
        content: t('worker.sendingQRCodesToWhatsApp', { count: String(selectedWorkers.length) }) || `正在发送二维码到${selectedWorkers.length}个工人的WhatsApp`, 
        key: loadingKey 
      });
      
      try {
        setSendingWhatsAppLoading(true);
        
        // 生成二维码并准备批量发送数据
        const workerDataPromises = selectedWorkers.map(async worker => {
          try {
            // 获取工人的二维码数据
            const qrCodeData = await apiService.generateQRCodeByWorkerId(worker.workerId);
            if (!qrCodeData || !qrCodeData.qrCodeDataUrl) {
              throw new Error(t('qrcode.generateFailed'));
            }
            
            return {
              workerWhatsApp: worker.whatsapp,
              workerName: worker.name,
              workerId: worker.workerId,
              qrCodeDataUrl: qrCodeData.qrCodeDataUrl
            };
          } catch (err) {
            console.error(`生成工人[${worker.name}]的二维码失败:`, err);
            return null;
          }
        });
        
        // 等待所有二维码生成完成
        const workerDataResults = await Promise.all(workerDataPromises);
        const validWorkerData = workerDataResults.filter(data => data !== null);
        
        if (validWorkerData.length === 0) {
          message.error({ content: t('messages.allGenerationFailed'), key: loadingKey });
          return;
        }
        
        // 获取当前的语言设置
        const currentLocale = localStorage.getItem('locale') || 'zh-CN';
        
        // 分批发送，避免请求过大
        const BATCH_SIZE = 10; // 每斑10个工人
        let successCount = 0;
        let failedCount = 0;
        let allFailedItems: any[] = [];
        
        // 将工人数据分成多个批次
        const batches = [];
        for (let i = 0; i < validWorkerData.length; i += BATCH_SIZE) {
          batches.push(validWorkerData.slice(i, i + BATCH_SIZE));
        }
        
        // 显示批次信息
        message.info({ 
          content: t('worker.batchProcessingInfo', { 
            batches: String(batches.length), 
            total: String(validWorkerData.length)
          }) || `将分${batches.length}批处理${validWorkerData.length}个工人数据`,
          key: loadingKey 
        });
        
        // 逐批处理
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          
          // 更新加载消息
          message.loading({ 
            content: `处理第${i+1}/${batches.length}批 (${batch.length}个工人)`, 
            key: loadingKey 
          });
          
          // 批量发送二维码到WhatsApp
          const result = await apiService.batchSendQRCodeWhatsApp({
            workers: batch,
            language: currentLocale
          });
          
          if (result.success) {
            // 累加成功数量
            successCount += (result.results?.succeeded || 0);
            
            // 收集失败项
            if (result.results && result.results.failed > 0) {
              const batchFailedItems = result.results.details.filter(item => !item.success);
              allFailedItems = [...allFailedItems, ...batchFailedItems];
              failedCount += result.results.failed;
            }
            
            // 更新进度消息
            message.loading({ 
              content: `已完成${i+1}/${batches.length}批，成功${successCount}个，失败${failedCount}个`, 
              key: loadingKey 
            });
          } else {
            // 整批失败
            message.error({ 
              content: `第${i+1}批发送失败: ${result.message || t('worker.batchSendFailed')}`, 
              key: loadingKey 
            });
            failedCount += batch.length;
          }
        }
        
        // 所有批次处理完毕，设置最终result为汇总结果
        const result = {
          success: true,
          results: {
            succeeded: successCount,
            failed: failedCount,
            total: validWorkerData.length,
            details: allFailedItems
          }
        };
        
        if (result.success) {
          message.success({ 
            content: t('worker.batchSendComplete', { 
              count: String(result.results?.succeeded || 0),
              total: String(result.results?.total || validWorkerData.length)
            }),
            key: loadingKey
          });
          
          // 显示详细结果
          if (result.results && result.results.failed > 0) {
            // 准备失败项数据
            const failedItems = result.results.details.filter(item => !item.success);
            
            // 创建一个可选择的Modal对话框
            const failedModal = Modal.warning({
              title: t('worker.partialSendFailure', { 
                failed: String(result.results.failed),
                total: String(result.results.total)
              }),
              content: (
                <FailedItemsContent 
                  failedItems={failedItems}
                  onResend={async (selectedItems) => {
                    // 类似邮件重发的逻辑，可以根据需求实现WhatsApp的重发逻辑
                    // 这里简化处理，只显示一个信息
                    failedModal.destroy();
                    if (selectedItems && selectedItems.length > 0) {
                      message.info(t('worker.whatsAppResendNotImplemented') || '重新发送WhatsApp功能暂未实现');
                    }
                  }}
                  t={t}
                />
              ),
              okText: t('common.ok'),
              width: 700,
            });
          }
          
          // 批量发送成功后清除选择
          setSelectedRowKeys([]);
        } else {
          message.error({ content: t('worker.batchSendFailed'), key: loadingKey });
        }
      } catch (error) {
        console.error('批量发送二维码到WhatsApp失败:', error);
        message.error({ 
          content: typeof error === 'string' ? error : t('messages.batchSendFailed'), 
          key: loadingKey 
        });
      } finally {
        setSendingWhatsAppLoading(false);
      }
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
      width: 120,
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
          <Tooltip title={t('common.edit')}>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit(record)}
            />
          </Tooltip>
          {onToggleStatus && (
            <Tooltip title={record.status?.toLowerCase() === 'active' ? t('common.disable') : t('common.enable')}>
              <Button
                type="text"
                size="small"
                icon={record.status?.toLowerCase() === 'active' ? <StopOutlined /> : <CheckCircleOutlined />}
                onClick={() => onToggleStatus(record)}
                style={{ color: record.status?.toLowerCase() === 'active' ? '#ff4d4f' : '#52c41a' }}
              />
            </Tooltip>
          )}
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
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* 批量操作工具栏 */}
      {selectedRowKeys.length > 0 && (
        <div style={{ 
          marginBottom: 8, 
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
                / {t('worker.totalWorkers').replace('{count}', paginatedWorkers.length.toString())}
              </span>
            )}
          </span>
          <Space>
            <Button
              type="primary"
              icon={<MailOutlined />}
              onClick={() => handleBatchSendQRCode('email')}
              loading={sendingEmailLoading}
              size="small"
            >
              {t('worker.batchSendToEmail')} ({selectedRowKeys.length})
            </Button>
            <Button
              type="primary"
              icon={<WhatsAppOutlined />}
              onClick={() => handleBatchSendQRCode('whatsapp')}
              loading={sendingWhatsAppLoading}
              size="small"
            >
              {t('worker.batchSendToWhatsApp')} ({selectedRowKeys.length})
            </Button>
            <Button
              onClick={() => setSelectedRowKeys([])}
              size="small"
            >
              {t('worker.cancelSelection')}
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
    </div>
  );
};

export default WorkerTable;
