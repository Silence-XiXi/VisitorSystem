import React from 'react';
import { Modal, Progress, Typography, Space, Button, Tag } from 'antd';
import { LoadingOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useLocale } from '../../contexts/LocaleContext';

const { Text } = Typography;

interface SimpleEmailProgressModalProps {
  visible: boolean;
  onCancel: () => void;
  progress: number;
  successCount: number;
  failedItems: any[];
  total: number;
  failedItemsContent?: React.ReactNode;
}

const SimpleEmailProgressModal: React.FC<SimpleEmailProgressModalProps> = ({
  visible,
  onCancel,
  progress,
  successCount,
  failedItems,
  total,
  failedItemsContent
}) => {
  const { t } = useLocale();
  
  const isCompleted = progress === 100;
  const hasFailures = failedItems && failedItems.length > 0;
  
  return (
    <Modal
      title={
        <Space>
          {isCompleted ? 
            (hasFailures ? <CloseCircleOutlined style={{ color: '#ff4d4f' }} /> : <CheckCircleOutlined style={{ color: '#52c41a' }} />) : 
            <LoadingOutlined style={{ color: '#1890ff' }} />
          }
          <span>{t('common.emailSendingProgress')}</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="close" onClick={onCancel}>
          {t('common.close')}
        </Button>
      ]}
      width={600}
    >
      <div>
        {/* 状态和进度 */}
        <div style={{ marginBottom: 24 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text strong>{t('common.taskStatus')}：</Text>
              <Tag
                color={isCompleted ? (hasFailures ? 'error' : 'success') : 'processing'}
                style={{ 
                  padding: '2px 8px', 
                  fontSize: '14px'
                }}
              >
                {isCompleted ? 
                  (hasFailures ? t('common.completedWithErrors') || '完成(有错误)' : t('common.completed') || '完成') : 
                  t('common.processing') || '处理中'}
              </Tag>
            </div>

            <div>
              <Text strong>{t('common.sendingProgress')}：</Text>
              <Progress
                percent={progress}
                status={hasFailures ? 'exception' : (isCompleted ? 'success' : 'active')}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text>
                {t('common.successCount')}：<Text strong style={{ color: '#52c41a' }}>{successCount || 0}</Text> / {total || 0}
              </Text>
              <Text>
                {t('common.failedCount')}：<Text strong style={{ color: '#ff4d4f' }}>{failedItems ? failedItems.length : 0}</Text>
              </Text>
            </div>
          </Space>
        </div>

        {/* 失败项内容 */}
        {isCompleted && failedItems && failedItems.length > 0 && failedItemsContent}
      </div>
    </Modal>
  );
};

export default SimpleEmailProgressModal;
