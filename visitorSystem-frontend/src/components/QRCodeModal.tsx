import React, { useEffect, useState, useCallback } from 'react';
import { Modal, Button, message, Spin, Space } from 'antd';
import { DownloadOutlined, CopyOutlined, QrcodeOutlined, MailOutlined, MessageOutlined } from '@ant-design/icons';
import { Worker } from '../types/worker';
import { useLocale } from '../contexts/LocaleContext';
import { apiService } from '../services/api';
import QRCode from 'qrcode';


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
  const [sendingEmail, setSendingEmail] = useState(false);

  const generateQRCode = useCallback(async () => {
    if (!worker) return;
    
    setLoading(true);
    try {
      // 生成只包含工人编号的二维码数据
      const qrText = worker.workerId;
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

  const handleSendEmail = async () => {
    if (!worker?.email) {
      message.warning(t('qrcode.noEmailWarning'));
      return;
    }

    if (!qrCodeDataUrl) {
      message.error(t('qrcode.generateFailed'));
      return;
    }

    setSendingEmail(true);
    try {
      // 获取当前的语言设置
      const currentLocale = localStorage.getItem('locale') || 'zh-CN';
      
      const result = await apiService.sendQRCodeEmail({
        workerEmail: worker.email,
        workerName: worker.name,
        workerId: worker.workerId,
        qrCodeDataUrl: qrCodeDataUrl,
        language: currentLocale,
      });

      if (result.success) {
        message.success(t('qrcode.qrCodeSentToEmail', { email: worker.email }));
      } else {
        message.error(result.message || t('qrcode.emailSendFailed'));
      }
    } catch (error: unknown) {
      console.error('发送邮件失败:', error);
      const errorMessage = error instanceof Error ? error.message : t('qrcode.emailSendFailed');
      message.error(`${t('qrcode.emailSendFailed')}: ${errorMessage}`);
      message.warning('请检查系统邮件配置是否正确，或联系管理员');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendWhatsApp = () => {
    if (!worker?.whatsapp) {
      message.warning(t('qrcode.noWhatsappWarning'));
      return;
    }
    // 这里应该调用实际的WhatsApp发送API
    console.log('发送WhatsApp二维码到:', worker.whatsapp, '工人编号:', worker.workerId);
    message.success(t('qrcode.qrCodeSentToWhatsapp', { whatsapp: worker.whatsapp }));
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
            
            <div style={{ textAlign: 'center' }}>
              <Space size="middle" style={{ marginBottom: '16px' }}>
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
              <Space size="middle">
                <Button
                  icon={<MailOutlined />}
                  onClick={handleSendEmail}
                  disabled={!worker?.email || sendingEmail}
                  loading={sendingEmail}
                >
                  {sendingEmail ? t('qrcode.sendingEmail') : t('qrcode.sendEmail')}
                </Button>
                <Button
                  icon={<MessageOutlined />}
                  onClick={handleSendWhatsApp}
                  disabled={!worker?.whatsapp}
                >
                  {t('qrcode.sendWhatsApp')}
                </Button>
              </Space>
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
