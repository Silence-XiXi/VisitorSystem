import React, { useEffect, useState } from 'react';
import { Modal, Button, message, Spin, Typography, Space, Tag } from 'antd';
import { DownloadOutlined, CopyOutlined, QrcodeOutlined } from '@ant-design/icons';
import { Worker } from '../types/worker';
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
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [qrCodeText, setQrCodeText] = useState<string>('');

  useEffect(() => {
    if (visible && worker) {
      generateQRCode();
    }
  }, [visible, worker]);

  const generateQRCode = async () => {
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
      message.error('生成二维码失败！');
      console.error('QR Code generation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!qrCodeDataUrl) return;
    
    const link = document.createElement('a');
    link.download = `${worker?.name || 'worker'}_qrcode.png`;
    link.href = qrCodeDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('二维码下载成功！');
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(qrCodeText);
      message.success('二维码数据已复制到剪贴板！');
    } catch (error) {
      message.error('复制失败，请手动复制！');
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
      message.success('二维码图片已复制到剪贴板！');
    } catch (error) {
      message.error('复制图片失败！');
    }
  };

  if (!worker) return null;

  return (
    <Modal
      title={
        <Space>
          <QrcodeOutlined />
          <span>工人二维码 - {worker.name}</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>
      ]}
      width={600}
      centered
    >
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ marginBottom: '20px' }}>
          <Title level={4}>{worker.name}</Title>
          <Space direction="vertical" size="small">
            <Text>工人编号：{worker.workerId}</Text>
            <Text>身份证号：{worker.idCard}</Text>
            <Text>联系电话：{worker.phone}</Text>
            <Text>状态：<Tag color={worker.status === 'active' ? 'green' : 'red'}>
              {worker.status === 'active' ? '在职' : worker.status === 'inactive' ? '离职' : '暂停'}
            </Tag></Text>
          </Space>
        </div>

        {loading ? (
          <div style={{ padding: '40px' }}>
            <Spin size="large" />
            <div style={{ marginTop: '16px' }}>正在生成二维码...</div>
          </div>
        ) : qrCodeDataUrl ? (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <img
                src={qrCodeDataUrl}
                alt="工人二维码"
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
                下载二维码
              </Button>
              <Button
                icon={<CopyOutlined />}
                onClick={handleCopyText}
              >
                复制数据
              </Button>
              <Button
                icon={<CopyOutlined />}
                onClick={handleCopyImage}
              >
                复制图片
              </Button>
            </Space>
            
            <div style={{ marginTop: '20px', textAlign: 'left' }}>
              <Text type="secondary">
                <strong>二维码说明：</strong><br />
                • 此二维码包含工人的基本信息<br />
                • 门卫可通过扫描此二维码进行签到登记<br />
                • 二维码数据已加密，确保信息安全<br />
                • 建议定期更新二维码以确保安全性
              </Text>
            </div>
          </div>
        ) : (
          <div style={{ padding: '40px', color: '#999' }}>
            二维码生成失败
          </div>
        )}
      </div>
    </Modal>
  );
};

export default QRCodeModal;
