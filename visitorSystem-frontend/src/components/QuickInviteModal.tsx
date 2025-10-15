import React, { useState } from 'react';
import { Modal, Form, Input, Select, Button, message, Space } from 'antd';
import { WhatsAppOutlined, CopyOutlined } from '@ant-design/icons';
import { useLocale } from '../contexts/LocaleContext';

const { Option } = Select;
const { TextArea } = Input;

interface Site {
  id: string;
  name: string;
}

interface QuickInviteModalProps {
  visible: boolean;
  onClose: () => void;
  onSend: (phoneNumbers: string[], areaCode: string, siteId: string) => Promise<void>;
  onCopyLink: (siteId: string) => void;
  sites: Site[];
  loading?: boolean;
}

const QuickInviteModal: React.FC<QuickInviteModalProps> = ({
  visible,
  onClose,
  onSend,
  onCopyLink,
  sites,
  loading = false
}) => {
  const { t, locale } = useLocale();
  const [form] = Form.useForm();
  const [sending, setSending] = useState(false);

  // 根据语言确定默认区号
  const getDefaultAreaCode = () => {
    if (locale === 'zh-CN') {
      return '+86'; // 简体中文默认中国大陆
    } else {
      return '+852'; // 繁体中文和英文默认香港
    }
  };

  // 区号选项
  const areaCodeOptions = [
    { value: '+86', label: `+86 (${t('distributor.areaCodeChina')})` },
    { value: '+852', label: `+852 (${t('distributor.areaCodeHongKong')})` },
    { value: '+853', label: `+853 (${t('distributor.areaCodeMacau')})` },
    { value: '+886', label: `+886 (${t('distributor.areaCodeTaiwan')})` },
    { value: '+65', label: `+65 (${t('distributor.areaCodeSingapore')})` },
    { value: '+60', label: `+60 (${t('distributor.areaCodeMalaysia')})` },
    { value: '+66', label: `+66 (${t('distributor.areaCodeThailand')})` },
    { value: '+63', label: `+63 (${t('distributor.areaCodePhilippines')})` },
    { value: '+62', label: `+62 (${t('distributor.areaCodeIndonesia')})` },
    { value: '+84', label: `+84 (${t('distributor.areaCodeVietnam')})` },
    { value: '+1', label: `+1 (${t('distributor.areaCodeUSCanada')})` },
    { value: '+44', label: `+44 (${t('distributor.areaCodeUK')})` },
    { value: '+49', label: `+49 (${t('distributor.areaCodeGermany')})` },
    { value: '+33', label: `+33 (${t('distributor.areaCodeFrance')})` },
    { value: '+81', label: `+81 (${t('distributor.areaCodeJapan')})` },
    { value: '+82', label: `+82 (${t('distributor.areaCodeKorea')})` },
    { value: '+91', label: `+91 (${t('distributor.areaCodeIndia')})` },
    { value: '+61', label: `+61 (${t('distributor.areaCodeAustralia')})` },
  ];

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const { phoneNumbers, areaCode, siteId } = values;
      
      // 解析电话号码 - 支持多种分隔符（空格、逗号、换行、分号等）
      const phoneList = phoneNumbers
        .split(/[,，\s\n\r;；]+/) // 支持逗号、空格、换行、分号等分隔符
        .map((phone: string) => phone.trim())
        .filter((phone: string) => phone.length > 0);
      
      if (phoneList.length === 0) {
        message.error(t('distributor.pleaseEnterPhoneNumbers'));
        return;
      }
      
      if (!siteId) {
        message.error(t('distributor.pleaseSelectSite'));
        return;
      }
      
      setSending(true);
      await onSend(phoneList, areaCode, siteId);
      
      // 成功后关闭弹窗并重置表单
      form.resetFields();
      onClose();
    } catch (error) {
      console.error('表单验证失败:', error);
    } finally {
      setSending(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  const handleCopyLink = () => {
    const values = form.getFieldsValue();
    const { siteId } = values;
    
    if (!siteId) {
      message.error(t('distributor.pleaseSelectSite'));
      return;
    }
    
    onCopyLink(siteId);
  };

  return (
    <Modal
      title={
        <Space>
          <WhatsAppOutlined style={{ color: '#25D366' }} />
          {t('distributor.quickInviteTitle')}
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          {t('common.cancel')}
        </Button>,
        <Button
          key="copy"
          icon={<CopyOutlined />}
          onClick={handleCopyLink}
        >
          {t('distributor.copyLink')}
        </Button>,
        <Button
          key="send"
          type="primary"
          icon={<WhatsAppOutlined />}
          loading={sending || loading}
          onClick={handleSubmit}
        >
          {t('distributor.sendInvite')}
        </Button>,
      ]}
      width={600}
      destroyOnClose
    >
      <div style={{ marginBottom: 16, color: '#666' }}>
        {t('distributor.quickInviteDescription')}
      </div>
      
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          areaCode: getDefaultAreaCode(),
          siteId: sites.length > 0 ? sites[0].id : undefined
        }}
      >
        <Form.Item
          name="siteId"
          label={t('distributor.selectSite')}
          rules={[
            { required: true, message: t('distributor.pleaseSelectSite') }
          ]}
        >
          <Select
            placeholder={t('distributor.selectSitePlaceholder')}
            showSearch
            filterOption={(input, option) =>
              (option?.children ?? '').toString().toLowerCase().includes(input.toLowerCase())
            }
          >
            {sites.map(site => (
              <Option key={site.id} value={site.id}>
                {site.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="areaCode"
          label={t('distributor.areaCode')}
          rules={[
            { required: true, message: t('distributor.pleaseSelectAreaCode') }
          ]}
        >
          <Select
            placeholder={t('distributor.areaCodePlaceholder')}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
            }
          >
            {areaCodeOptions.map(option => (
              <Option key={option.value} value={option.value} label={option.label}>
                {option.label}
              </Option>
            ))}
          </Select>
        </Form.Item>
        
        <Form.Item
          name="phoneNumbers"
          label={t('distributor.phoneNumbers')}
          rules={[
            { required: true, message: t('distributor.pleaseEnterPhoneNumbers') }
          ]}
        >
          <TextArea
            placeholder={t('distributor.phoneNumbersPlaceholder')}
            rows={4}
            showCount
            maxLength={500}
          />
        </Form.Item>
      </Form>
      
      <div style={{ 
        marginTop: 16, 
        padding: 12, 
        backgroundColor: '#f6ffed', 
        border: '1px solid #b7eb8f', 
        borderRadius: 6,
        fontSize: 12,
        color: '#666'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
          {t('distributor.usageInstructions')}
        </div>
        <div>• {t('distributor.usageStep1')}</div>
        <div>• {t('distributor.usageStep2')}</div>
        <div>• {t('distributor.usageStep3')}</div>
        <div>• {t('distributor.usageStep4')}</div>
        <div>• {t('distributor.usageExample')}</div>
      </div>
    </Modal>
  );
};

export default QuickInviteModal;
