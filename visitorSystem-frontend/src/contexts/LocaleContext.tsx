import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import zhCN from '../locales/zh-CN';
import zhTW from '../locales/zh-TW';
import enUS from '../locales/en-US';

export type LocaleType = 'zh-CN' | 'zh-TW' | 'en-US';

export interface LocaleContextType {
  locale: LocaleType;
  setLocale: (locale: LocaleType) => void;
  t: (key: string, params?: Record<string, string>) => string;
  messages: typeof zhCN;
}

const locales = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'en-US': enUS,
};

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
};

interface LocaleProviderProps {
  children: ReactNode;
}

export const LocaleProvider: React.FC<LocaleProviderProps> = ({ children }) => {
  const [locale, setLocale] = useState<LocaleType>(() => {
    // 从localStorage获取保存的语言设置，默认为简体中文
    const savedLocale = localStorage.getItem('locale') as LocaleType;
    return savedLocale && locales[savedLocale] ? savedLocale : 'zh-CN';
  });

  const messages = locales[locale];

  const t = (key: string, params?: Record<string, string>): string => {
    const keys = key.split('.');
    let value: any = messages;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key; // 如果找不到对应的翻译，返回原key
      }
    }
    
    if (typeof value !== 'string') {
      return key;
    }
    
    // 如果有参数，进行参数替换
    if (params) {
      return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
        return params[paramKey] || match;
      });
    }
    
    return value;
  };

  const handleSetLocale = (newLocale: LocaleType) => {
    setLocale(newLocale);
    localStorage.setItem('locale', newLocale);
    // 触发自定义事件，通知DynamicConfigProvider更新Ant Design的locale
    window.dispatchEvent(new CustomEvent('localeChanged'));
  };

  useEffect(() => {
    // 当语言改变时，更新document的lang属性
    document.documentElement.lang = locale;
  }, [locale]);

  const value: LocaleContextType = {
    locale,
    setLocale: handleSetLocale,
    t,
    messages,
  };

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
};
