import React, { useState } from 'react';
import { Modal, Upload, Button, message, Alert, List, Space, Progress, Card, Typography } from 'antd';
import { UploadOutlined, DownloadOutlined, FileExcelOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { readWorkerExcelFile, generateImportTemplate } from '../utils/excelUtils';
import { Worker, CreateWorkerRequest } from '../types/worker';
import { useLocale } from '../contexts/LocaleContext';

const { Title, Text } = Typography;

interface ExcelImportExportModalProps {
  visible: boolean;
  onClose: () => void;
  workers: Worker[];
  distributors: any[];
  sites: any[];
  onImport: (workers: CreateWorkerRequest[]) => Promise<void>;
}

const ExcelImportExportModal: React.FC<ExcelImportExportModalProps> = ({
  visible,
  onClose,
  workers,
  distributors,
  sites,
  onImport
}) => {
  const { t } = useLocale();
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    workers: CreateWorkerRequest[];
    errors: string[];
  } | null>(null);

  // 处理文件上传
  const handleFileUpload = (file: File) => {
    const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                    file.type === 'application/vnd.ms-excel';
    
    if (!isExcel) {
      message.error('只能上传Excel文件！');
      return false;
    }
    
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('文件大小不能超过5MB！');
      return false;
    }
    
    setImportFile(file);
    return false; // 阻止自动上传
  };

  // 处理导入
  const handleImport = async () => {
    if (!importFile) {
      message.warning('请先选择要导入的Excel文件');
      return;
    }

    try {
      setImportLoading(true);
      setImportProgress(0);
      
      // 模拟导入进度
      for (let i = 0; i <= 100; i += 10) {
        setImportProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // 直接提交Excel文件给后端处理
      await onImport(importFile);
      
      // 清理状态
      setImportFile(null);
      setImportResult(null);
      setImportProgress(0);
      
    } catch (error) {
      const errorMessage = (error as Error).message || '';
      
      // 检查权限错误
      if (errorMessage.includes('没有权限访问此资源') || 
          errorMessage.includes('权限') || 
          errorMessage.includes('permission') ||
          errorMessage.includes('unauthorized')) {
        message.error('权限不足：您没有创建工人数据的权限，请联系管理员');
      } else {
        message.error('导入失败：' + errorMessage);
      }
    } finally {
      setImportLoading(false);
    }
  };

  // 处理模板下载
  const handleDownloadTemplate = () => {
    try {
      generateImportTemplate();
      message.success(t('distributor.templateDownloaded'));
    } catch (error) {
      message.error('模板下载失败：' + (error as Error).message);
    }
  };

  // 重置导入状态
  const resetImport = () => {
    setImportFile(null);
    setImportResult(null);
    setImportProgress(0);
  };

  return (
    <Modal
      title={t('distributor.excelImport')}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
      destroyOnClose
    >
      <div style={{ padding: '20px 0' }}>
        {/* 模板下载 */}
        <Card size="small" style={{ marginBottom: 20 }}>
          <Space>
            <Button 
              type="primary" 
              icon={<DownloadOutlined />}
              onClick={handleDownloadTemplate}
            >
              {t('distributor.downloadTemplate')}
            </Button>
            <Text type="secondary">{t('distributor.templateDownloadTip')}</Text>
          </Space>
        </Card>

        {/* 文件上传 */}
        <Card size="small" style={{ marginBottom: 20 }}>
          <Upload
            accept=".xlsx,.xls"
            beforeUpload={handleFileUpload}
            showUploadList={false}
            disabled={importLoading}
          >
            <Button icon={<UploadOutlined />} disabled={importLoading}>
              选择Excel文件
            </Button>
          </Upload>
          
          {importFile && (
            <div style={{ marginTop: 10 }}>
              <Text>已选择文件：{importFile.name}</Text>
              <Button 
                type="link" 
                size="small" 
                onClick={resetImport}
                disabled={importLoading}
              >
                重新选择
              </Button>
            </div>
          )}
        </Card>

        {/* 导入进度 */}
        {importLoading && (
          <Card size="small" style={{ marginBottom: 20 }}>
            <Progress percent={importProgress} status="active" />
            <Text>正在导入数据...</Text>
          </Card>
        )}

        {/* 导入结果 */}
        {importResult && (
          <Card size="small" style={{ marginBottom: 20 }}>
            <Title level={5}>导入结果</Title>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Alert
                message={`成功解析 ${importResult.workers.length} 条数据`}
                type="success"
                showIcon
              />
              
              {importResult.errors.length > 0 && (
                <Alert
                  message={`发现 ${importResult.errors.length} 个错误`}
                  type="error"
                  showIcon
                />
              )}
              
              {importResult.errors.length > 0 && (
                <List
                  size="small"
                  dataSource={importResult.errors}
                  renderItem={(error, index) => (
                    <List.Item>
                      <Space>
                        <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                        <Text type="danger">{error}</Text>
                      </Space>
                    </List.Item>
                  )}
                />
              )}
            </Space>
          </Card>
        )}

        {/* 操作按钮 */}
        <div style={{ textAlign: 'center' }}>
          <Space>
            <Button 
              type="primary" 
              onClick={handleImport}
              loading={importLoading}
              disabled={!importFile}
              icon={<FileExcelOutlined />}
            >
              开始导入
            </Button>
            <Button onClick={onClose}>关闭</Button>
          </Space>
        </div>
      </div>
    </Modal>
  );
};

export default ExcelImportExportModal;
