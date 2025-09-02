import React from 'react';
import { Select, Space } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useLocale, LocaleType } from '../contexts/LocaleContext';

const { Option } = Select;

const LocaleSwitcher: React.FC = () => {
  const { locale, setLocale, t } = useLocale();

  const handleLocaleChange = (value: LocaleType) => {
    setLocale(value);
  };

  const localeOptions = [
    { value: 'zh-CN', label: '简体中文', flag: '🇨🇳' },
    { value: 'zh-TW', label: '香港繁体', flag: '🇭🇰' },
    { value: 'en-US', label: 'English', flag: '🇺🇸' },
  ];

  return (
    <Space>
      <GlobalOutlined style={{ color: '#666' }} />
      <Select
        value={locale}
        onChange={handleLocaleChange}
        style={{ width: 120 }}
        size="small"
      >
        {localeOptions.map(option => (
          <Option key={option.value} value={option.value}>
            <Space>
              <span>{option.flag}</span>
              <span>{option.label}</span>
            </Space>
          </Option>
        ))}
      </Select>
    </Space>
  );
};

export default LocaleSwitcher;
