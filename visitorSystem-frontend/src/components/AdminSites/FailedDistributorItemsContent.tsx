import React, { useState } from 'react'
import { Button, Space, Table, message } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useLocale } from '../../contexts/LocaleContext'

interface FailedItem {
  email: string;
  name: string;
  contactName: string;
  username: string;
  success: boolean;
  message?: string;
}

interface FailedDistributorItemsContentProps {
  failedItems: FailedItem[];
  onResend: (selectedItems: FailedItem[]) => void;
  loading?: boolean;
}

const FailedDistributorItemsContent: React.FC<FailedDistributorItemsContentProps> = ({ 
  failedItems, 
  onResend,
  loading = false
}) => {
  const { t } = useLocale();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // 表格行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys);
    }
  };

  // 处理重新发送
  const handleResend = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning(t('messages.pleaseSelectItemsToResend'));
      return;
    }

    const selectedItems = failedItems.filter((item, index) => selectedRowKeys.includes(`${item.email}-${index}`));
    
    // 立即显示开始重发的消息
    message.loading({
      content: t('messages.resendingDistributorEmails').replace('{count}', selectedItems.length.toString()),
      key: 'resendDistributorPrepare',
      duration: 2 // 显示2秒
    });
    
    await onResend(selectedItems);
  };

  // 全选
  const handleSelectAll = () => {
    setSelectedRowKeys(failedItems.map((item, index) => `${item.email}-${index}`));
  };

  // 取消全选
  const handleDeselectAll = () => {
    setSelectedRowKeys([]);
  };

  return (
    <div>
      <p style={{ marginBottom: 16 }}>
        {t('admin.sendFailureExplanationDistributor')}
      </p>
      
      {/* 操作工具栏 */}
      <div style={{ 
        marginBottom: 16, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center'
      }}>
        <Space>
          <Button 
            size="small" 
            onClick={handleSelectAll}
            disabled={loading}
          >
            {t('common.selectAll')}
          </Button>
          <Button 
            size="small" 
            onClick={handleDeselectAll}
            disabled={loading}
          >
            {t('common.deselectAll')}
          </Button>
        </Space>

        <Button 
          type="primary" 
          icon={<ReloadOutlined />} 
          onClick={handleResend}
          disabled={selectedRowKeys.length === 0 || loading}
          loading={loading}
        >
          {loading 
            ? t('common.resending')
            : `${t('common.resendSelected')} (${selectedRowKeys.length})`
          }
        </Button>
      </div>

      <Table
        rowSelection={rowSelection}
        size="small"
        dataSource={failedItems}
        columns={[
          {
            title: t('admin.distributorName'),
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => text || '-'
          },
          {
            title: t('admin.distributorContact'),
            dataIndex: 'contactName',
            key: 'contactName',
            render: (text: string) => text || '-'
          },
          {
            title: t('admin.distributorEmail'),
            dataIndex: 'email',
            key: 'email',
            width: 150
          },
          {
            title: t('common.error'),
            dataIndex: 'message',
            key: 'message',
            render: (text: string) => text || '-',
            width: 300
          }
        ]}
        pagination={false}
        rowKey={(record, index) => `${record.email}-${index}`}
        scroll={{ y: 200 }}
      />
    </div>
  );
};

export default FailedDistributorItemsContent;
