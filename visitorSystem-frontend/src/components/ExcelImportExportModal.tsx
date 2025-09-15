import React, { useState } from 'react';
import { Modal, Tabs, Upload, Button, message, Alert, List, Space, Progress, Card, Typography, Divider } from 'antd';
import { UploadOutlined, DownloadOutlined, FileExcelOutlined, CheckCircleOutlined, CloseCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { readExcelFile, exportWorkersToExcel, generateImportTemplate } from '../utils/excelUtils';
import { Worker, CreateWorkerRequest } from '../types/worker';
import { useLocale } from '../contexts/LocaleContext';

const { TabPane } = Tabs;
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
  const [activeTab, setActiveTab] = useState('import');
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
      
      // 读取Excel文件
      const result = await readExcelFile(importFile);
      setImportResult(result);
      
      if (result.errors.length > 0) {
        message.warning(`导入过程中发现 ${result.errors.length} 个错误，请检查后重新导入`);
        return;
      }
      
      if (result.workers.length === 0) {
        message.warning('没有找到有效的数据行');
        return;
      }
      
      // 模拟导入进度
      for (let i = 0; i <= 100; i += 10) {
        setImportProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // 执行导入
      await onImport(result.workers);
      
      message.success(`成功导入 ${result.workers.length} 个工人信息`);
      setImportFile(null);
      setImportResult(null);
      setImportProgress(0);
      
    } catch (error) {
      message.error('导入失败：' + (error as Error).message);
    } finally {
      setImportLoading(false);
    }
  };

  // 处理导出
  const handleExport = () => {
    if (workers.length === 0) {
      message.warning('没有工人数据可导出');
      return;
    }
    
    try {
      exportWorkersToExcel(workers, distributors, sites, t);
      message.success('导出成功！');
    } catch (error) {
      message.error('导出失败：' + (error as Error).message);
    }
  };

  // 处理模板下载
  const handleDownloadTemplate = () => {
    try {
      generateImportTemplate();
      message.success('模板下载成功！');
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
      title="Excel导入导出"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      destroyOnClose
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="批量导入" key="import">
          <div style={{ padding: '20px 0' }}>
            {/* 导入说明 */}
            <Alert
              message="导入说明"
              description={
                <div>
                  <p>• 支持.xlsx和.xls格式的Excel文件</p>
                  <p>• 文件大小不能超过5MB</p>
                  <p>• 第一行必须是标题行，包含：工人编号、姓名、性别、身份证号、地区、分判商ID、工地ID、联系电话、邮箱、WhatsApp、状态</p>
                  <p>• 性别：男/女，状态：在职/暂停/离职，地区：中国大陆/中国香港/中国澳门/中国台湾/其他</p>
                  <p>• 所有字段都是必填的</p>
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: 20 }}
            />

            {/* 模板下载 */}
            <Card size="small" style={{ marginBottom: 20 }}>
              <Space>
                <Button 
                  type="primary" 
                  icon={<DownloadOutlined />}
                  onClick={handleDownloadTemplate}
                >
                  下载导入模板
                </Button>
                <Text type="secondary">下载模板文件，按照格式填写后导入</Text>
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
        </TabPane>

        <TabPane tab="批量导出" key="export">
          <div style={{ padding: '20px 0' }}>
            {/* 导出说明 */}
            <Alert
              message="导出说明"
              description={
                <div>
                  <p>• 导出当前所有工人信息到Excel文件</p>
                  <p>• 包含：工人编号、姓名、性别、身份证号、地区、分判商、工地、联系电话、邮箱、WhatsApp、状态</p>
                  <p>• 文件将以"工人信息_日期.xlsx"格式命名</p>
                  <p>• 当前共有 {workers.length} 个工人信息</p>
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: 20 }}
            />

            {/* 导出按钮 */}
            <div style={{ textAlign: 'center' }}>
              <Space>
                <Button 
                  type="primary" 
                  onClick={handleExport}
                  disabled={workers.length === 0}
                  icon={<DownloadOutlined />}
                  size="large"
                >
                  导出工人信息 ({workers.length})
                </Button>
                <Button onClick={onClose}>关闭</Button>
              </Space>
            </div>
          </div>
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default ExcelImportExportModal;
