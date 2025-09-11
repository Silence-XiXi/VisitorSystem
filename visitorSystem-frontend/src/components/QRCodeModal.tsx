import React, { useEffect, useState, useCallback } from 'react';
import { Modal, Button, message, Spin, Typography, Space, Tag } from 'antd';
import { DownloadOutlined, CopyOutlined, QrcodeOutlined } from '@ant-design/icons';
import { Worker } from '../types/worker';
import { useLocale } from '../contexts/LocaleContext';
import QRCode from 'qrcode';

const { Title, Text } = Typography;

interface QRCodeModalProps {
  worker: Worker | null;
  visible: boolean;
  onClose: () => void;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({
  worker,
  visible,
  onClose
}) => {
  const { t } = useLocale();
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [qrCodeText, setQrCodeText] = useState<string>('');

  const generateQRCode = useCallback(async () => {
    if (!worker) return;
    
    setLoading(true);
    try {
      // 生成包含工人信息的二维码数据
      const qrData = {
        type: 'worker',
        workerId: worker.workerId,
        name: worker.name,
        idCard: worker.idCard,
        timestamp: Date.now(),
        // 这里可以添加更多需要的信息
      };
      
      const qrText = JSON.stringify(qrData);
      setQrCodeText(qrText);
      
      // 生成二维码图片
      const dataUrl = await QRCode.toDataURL(qrText, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQrCodeDataUrl(dataUrl);
    } catch (error) {
      message.error(t('qrcode.generateFailed'));
      console.error('QR Code generation error:', error);
    } finally {
      setLoading(false);
    }
  }, [worker, t]);

  useEffect(() => {
    if (visible && worker) {
      generateQRCode();
    }
  }, [visible, worker, generateQRCode]);

  const handleDownload = () => {
    if (!qrCodeDataUrl) return;
    
    const link = document.createElement('a');
    link.download = `${worker?.name || 'worker'}_qrcode.png`;
    link.href = qrCodeDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success(t('qrcode.downloadSuccess'));
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(qrCodeText);
      message.success(t('qrcode.copyDataSuccess'));
    } catch (error) {
      message.error(t('qrcode.copyFailed'));
    }
  };

  const handleCopyImage = async () => {
    try {
      const response = await fetch(qrCodeDataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      message.success(t('qrcode.copyImageSuccess'));
    } catch (error) {
      message.error(t('qrcode.copyImageFailed'));
    }
  };

  if (!worker) return null;

  return (
    <Modal
      title={
        <Space>
          <QrcodeOutlined />
          <span>{t('qrcode.workerQRCode')} - {worker.name}</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          {t('qrcode.close')}
        </Button>
      ]}
      width={600}
      centered
    >
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ marginBottom: '20px' }}>
          <Title level={4}>{worker.name}</Title>
          <Space direction="vertical" size="small">
            <Text>{t('qrcode.workerId')}：{worker.workerId}</Text>
            <Text>{t('qrcode.idCard')}：{worker.idCard}</Text>
            <Text>{t('qrcode.contactPhone')}：{worker.phone}</Text>
            <Text>{t('qrcode.status')}：<Tag color={worker.status === 'active' ? 'green' : 'red'}>
              {worker.status === 'active' ? t('qrcode.active') : worker.status === 'inactive' ? t('qrcode.inactive') : t('qrcode.suspended')}
            </Tag></Text>
          </Space>
        </div>

        {loading ? (
          <div style={{ padding: '40px' }}>
            <Spin size="large" />
            <div style={{ marginTop: '16px' }}>{t('qrcode.generateQR')}</div>
          </div>
        ) : qrCodeDataUrl ? (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <img
                src={qrCodeDataUrl}
                alt={t('qrcode.qrCodeAlt')}
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  border: '1px solid #d9d9d9',
                  borderRadius: '8px'
                }}
              />
            </div>
            
            <Space size="middle">
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleDownload}
              >
                {t('qrcode.downloadQR')}
              </Button>
              <Button
                icon={<CopyOutlined />}
                onClick={handleCopyText}
              >
                {t('qrcode.copyData')}
              </Button>
              <Button
                icon={<CopyOutlined />}
                onClick={handleCopyImage}
              >
                {t('qrcode.copyImage')}
              </Button>
            </Space>
            
            <div style={{ marginTop: '20px', textAlign: 'left' }}>
              <Text type="secondary">
                <strong>{t('qrcode.qrDescription')}：</strong><br />
                {t('qrcode.qrDescription1')}<br />
                {t('qrcode.qrDescription2')}<br />
                {t('qrcode.qrDescription3')}<br />
                {t('qrcode.qrDescription4')}
              </Text>
            </div>
          </div>
        ) : (
          <div style={{ padding: '40px', color: '#999' }}>
            {t('qrcode.qrCodeGenerationFailed')}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default QRCodeModal;
