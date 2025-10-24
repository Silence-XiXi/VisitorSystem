import React, { useState, useEffect, useRef } from 'react';
import { Modal, Progress, Typography, Button, Space, Tag, Alert, message, Table } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, LoadingOutlined, StopOutlined, ReloadOutlined, MailOutlined, EyeOutlined } from '@ant-design/icons';
import { useLocale } from '../contexts/LocaleContext';
import { apiService } from '../services/api';

const { Text } = Typography;

interface EmailJobProgress {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  total: number;
  success: number;
  failed: number;
  errors: Array<{ email: string; error: string }>;
  estimatedTimeRemaining?: number;
  isCancelled?: boolean;
}

interface EmailProgressModalProps {
  visible: boolean;
  jobId: string | null;
  onClose: () => void;
  onComplete?: (result: EmailJobProgress) => void;
  onRetryFailed?: (failedEmails: Array<{ email: string; error: string }>) => void;
  // 新增：支持不同的数据类型
  dataType?: 'worker' | 'distributor' | 'guard';
}

const EmailProgressModal: React.FC<EmailProgressModalProps> = ({
  visible,
  jobId,
  onClose,
  onComplete,
  onRetryFailed,
  dataType = 'worker',
}) => {
  const { t } = useLocale();
  const [progress, setProgress] = useState<EmailJobProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [hasFailures, setHasFailures] = useState(false);
  const [failedItems, setFailedItems] = useState<Array<{id: string, name: string, email: string, error: string}>>([]);
  const [resultModalShown, setResultModalShown] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 格式化时间
  const formatTime = (seconds?: number) => {
    if (!seconds) return t('common.loading');
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return t('common.formatTime', { hours: hours.toString(), minutes: minutes.toString(), seconds: secs.toString() });
    } else if (minutes > 0) {
      return t('common.formatTimeShort', { minutes: minutes.toString(), seconds: secs.toString() });
    } else {
      return `${secs}${t('common.seconds')}`;
    }
  };


  // 取消任务
  const handleCancel = async () => {
    if (!jobId) return;
    
    try {
      setCancelling(true);
      const response = await apiService.cancelEmailJob(jobId);
      
      if (response.success) {
        message.success(t('common.emailTaskCancelled'));
        onClose();
      } else {
        message.error(t('common.emailTaskCancelFailed'));
      }
    } catch (err) {
      message.error(t('common.emailTaskCancelFailed'));
    } finally {
      setCancelling(false);
    }
  };

  // 重新发送失败的邮件
  const handleRetryFailed = () => {
    console.log('EmailProgressModal: handleRetryFailed 被调用');
    console.log('failedItems:', failedItems);
    console.log('onRetryFailed 函数:', onRetryFailed);
    
    if (failedItems.length > 0) {
      // 将失败项目信息转换为错误格式，以便父组件处理
      const failedEmails = failedItems.map(item => ({
        email: item.email,
        error: item.error
      }));
      console.log('准备调用 onRetryFailed，参数:', failedEmails);
      onRetryFailed?.(failedEmails);
      // 不调用 onClose()，让进度监控弹窗保持打开
    } else {
      console.log('没有失败的项目数据');
    }
  };

  // 轮询获取进度
  useEffect(() => {
    if (!visible || !jobId) return;


    const pollProgress = async () => {
      try {
        setLoading(true);
        setError(null);
        
        
        const response = await apiService.getEmailJobProgress(jobId);
        
        if (response.success) {
          setProgress(response.progress);
          
          // 如果任务完成，停止轮询并调用完成回调
          if (response.progress.status === 'completed' || response.progress.status === 'failed' || response.progress.status === 'cancelled') {
            // 设置失败状态和失败工人数据
            setHasFailures(response.progress.failed > 0);
            
            // 如果有失败，需要获取失败项目的详细信息
            if (response.progress.failed > 0) {
              // 根据数据类型生成不同的失败项目信息
              const failedItemsData = response.progress.errors.map((error, index) => {
                const prefix = dataType === 'worker' ? 'W' : dataType === 'distributor' ? 'D' : 'G';
                const namePrefix = dataType === 'worker' ? '工人' : dataType === 'distributor' ? '分判商' : '门卫';
                
                return {
                  id: `${prefix}${String(index + 1).padStart(3, '0')}`,
                  name: `${namePrefix}${index + 1}`,
                  email: error.email,
                  error: error.error
                };
              });
              setFailedItems(failedItemsData);
            }
            
            onComplete?.(response.progress);
            
            // 如果有失败，延迟显示结果弹窗（只显示一次）
            if (response.progress.failed > 0 && !resultModalShown) {
              setResultModalShown(true);
              setTimeout(() => {
                setShowResultModal(true);
              }, 1000);
            }
            return;
          }
        } else {
          setError('获取进度失败');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : '获取进度失败');
      } finally {
        setLoading(false);
      }
    };

    // 立即获取一次
    pollProgress();

    // 设置轮询间隔
    const interval = setInterval(pollProgress, 2000); // 每2秒轮询一次

    return () => {
      clearInterval(interval);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [visible, jobId, onComplete]);

  // 组件卸载时清理timeout
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'failed':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'cancelled':
        return <StopOutlined style={{ color: '#8c8c8c' }} />;
      case 'processing':
        return <LoadingOutlined style={{ color: '#1890ff' }} />;
      default:
        return <ClockCircleOutlined style={{ color: '#faad14' }} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return t('common.pending');
      case 'processing':
        return t('common.processing');
      case 'completed':
        return t('common.completed');
      case 'failed':
        return t('common.failed');
      case 'cancelled':
        return t('common.cancelled');
      default:
        return t('common.unknown');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'cancelled':
        return 'default';
      case 'processing':
        return 'processing';
      default:
        return 'default';
    }
  };


  if (!visible || !jobId) return null;

  return (
    <Modal
      title={
        <Space>
          {progress && getStatusIcon(progress.status)}
          <span>{t('common.emailSendingProgress')}</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          {t('common.close')}
        </Button>,
        // 只有在处理中时才显示取消按钮
        progress?.status === 'processing' && (
          <Button 
            key="cancel" 
            danger 
            onClick={handleCancel}
            loading={cancelling}
            icon={<StopOutlined />}
          >
            {t('common.cancelSending')}
          </Button>
        ),
        // 如果有失败且结果弹窗已关闭，显示查看详情按钮
        progress?.status === 'completed' && hasFailures && !showResultModal && (
          <Button 
            key="viewDetails" 
            onClick={() => setShowResultModal(true)}
            icon={<EyeOutlined />}
          >
            {t('common.viewDetails')}
          </Button>
        ),
        // 只有在有失败邮件时才显示重新发送按钮
        progress?.status === 'completed' && progress?.failed > 0 && (
          <Button 
            key="retry" 
            type="primary" 
            onClick={handleRetryFailed}
            icon={<ReloadOutlined />}
          >
            {t('common.retryFailed')}
          </Button>
        ),
      ].filter(Boolean)}
      width={600}
      closable={!loading}
      maskClosable={false}
    >
      {error && (
        <Alert
          message="获取进度失败"
          description={error}
          type="error"
          style={{ marginBottom: 16 }}
        />
      )}

      {progress && (
        <div>
          {/* 状态和进度 */}
          <div style={{ marginBottom: 24 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text strong>{t('common.taskStatus')}：</Text>
                <Tag color={getStatusColor(progress.status)}>
                  {getStatusText(progress.status)}
                </Tag>
              </div>

              <div>
                <Text strong>{t('common.sendingProgress')}：</Text>
                <Progress
                  percent={progress.progress}
                  status={progress.status === 'failed' ? 'exception' : 'active'}
                  format={(percent) => `${percent}%`}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>
                  {t('common.successCount')}：<Text strong style={{ color: '#52c41a' }}>{progress.success}</Text> / {progress.total}
                </Text>
                <Text>
                  {t('common.failedCount')}：<Text strong style={{ color: '#ff4d4f' }}>{progress.failed}</Text>
                </Text>
              </div>

              {progress.estimatedTimeRemaining !== undefined && progress.status === 'processing' && (
                <Text type="secondary">
                  {t('common.estimatedTimeRemaining')}：{formatTime(progress.estimatedTimeRemaining)}
                </Text>
              )}
            </Space>
          </div>


          {/* 完成状态 */}
          {progress.status === 'completed' && (
            <Alert
              message={t('common.emailSendingComplete')}
              description={t('common.successEmails', { count: progress.success.toString() }) + (progress.failed > 0 ? `，${t('common.failedEmails', { count: progress.failed.toString() })}` : '')}
              type={progress.failed === 0 ? 'success' : progress.success === 0 ? 'error' : 'warning'}
              showIcon
            />
          )}

          {progress.status === 'failed' && (
            <Alert
              message={t('common.emailSendingFailed')}
              description={t('common.emailSendingError')}
              type="error"
              showIcon
            />
          )}

          {progress.status === 'cancelled' && (
            <Alert
              message={t('common.emailSendingCancelled')}
              description={t('common.successEmails', { count: progress.success.toString() }) + `，${t('common.failedEmails', { count: progress.failed.toString() })}`}
              type="warning"
              showIcon
            />
          )}
        </div>
      )}

      {loading && !progress && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <LoadingOutlined style={{ fontSize: 24 }} />
          <div style={{ marginTop: 16 }}>
            <Text>{t('common.loading')}</Text>
          </div>
        </div>
      )}

      {/* 发送结果弹窗 */}
      {showResultModal && progress && (
        <Modal
          title={
            <Space>
              <MailOutlined />
              <span>{t('common.emailSendingResult')}</span>
            </Space>
          }
          open={showResultModal}
          onCancel={() => {
            setShowResultModal(false);
            setResultModalShown(false); // 重置状态，允许下次重新显示
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            // 只关闭结果弹窗，不关闭进度监控弹窗
          }}
          footer={[
            <Button key="close" type="primary" onClick={() => {
              setShowResultModal(false);
              setResultModalShown(false); // 重置状态，允许下次重新显示
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
              }
              // 只关闭结果弹窗，不关闭进度监控弹窗
            }}>
              {t('common.ok')}
            </Button>,
            // 如果有失败邮件，显示重新发送按钮
            progress.failed > 0 && (
              <Button 
                key="retry" 
                onClick={() => {
                  console.log('点击重新发送按钮');
                  setShowResultModal(false);
                  setResultModalShown(false); // 重置状态，允许下次重新显示
                  if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                    timeoutRef.current = null;
                  }
                  handleRetryFailed();
                  // 重新发送时不关闭进度监控弹窗，让用户看到重发进度
                }}
                icon={<ReloadOutlined />}
              >
                {t('common.retryFailed')}
              </Button>
            ),
          ].filter(Boolean)}
          width={800}
          closable={true}
          maskClosable={false}
        >
          <div>
            {/* 失败详情表格 */}
            {failedItems.length > 0 && (
              <div>
                <Text strong style={{ color: '#ff4d4f', fontSize: '18px', marginBottom: 16, display: 'block' }}>
                  {t('common.failureDetails')}（{failedItems.length}）：
                </Text>
                <Table
                  dataSource={failedItems.map((item, index) => ({ ...item, key: item.id || `${dataType}-${index}` }))}
                  columns={[
                    {
                      title: dataType === 'worker' ? t('worker.workerId') : 
                             dataType === 'distributor' ? t('admin.distributorId') : 
                             t('admin.guardId'),
                      dataIndex: 'id',
                      key: 'id',
                      width: 120,
                      render: (text) => <Text style={{ fontSize: '14px' }}>{text}</Text>
                    },
                    {
                      title: dataType === 'worker' ? t('worker.name') : 
                             dataType === 'distributor' ? t('admin.distributorName') : 
                             t('admin.guardName'),
                      dataIndex: 'name',
                      key: 'name',
                      width: 140,
                      render: (text) => <Text style={{ fontSize: '14px' }}>{text}</Text>
                    },
                    {
                      title: dataType === 'worker' ? t('worker.email') : 
                             dataType === 'distributor' ? t('admin.distributorEmail') : 
                             t('admin.guardEmail'),
                      dataIndex: 'email',
                      key: 'email',
                      width: 220,
                      render: (text) => <Text style={{ fontSize: '14px' }}>{text}</Text>
                    },
                    {
                      title: t('common.failureReason'),
                      dataIndex: 'error',
                      key: 'error',
                      ellipsis: true,
                      render: (text) => (
                        <Text type="secondary" style={{ fontSize: '14px' }}>
                          {text}
                        </Text>
                      )
                    }
                  ]}
                  pagination={false}
                  size="middle"
                  scroll={{ y: 300 }}
                  style={{ marginTop: 8 }}
                />
              </div>
            )}
          </div>
        </Modal>
      )}
    </Modal>
  );
};

export default EmailProgressModal;
