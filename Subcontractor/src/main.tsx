import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import zhTW from 'antd/locale/zh_TW'
import enUS from 'antd/locale/en_US'
import App from './App.tsx'
import './index.css'

// 动态ConfigProvider组件
const DynamicConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocale] = React.useState(zhCN)

  React.useEffect(() => {
    const savedLocale = localStorage.getItem('locale') || 'zh-CN'
    const antdLocale = savedLocale === 'zh-TW' ? zhTW : savedLocale === 'en-US' ? enUS : zhCN
    setLocale(antdLocale)
  }, [])

  // 监听语言变化
  React.useEffect(() => {
    const handleStorageChange = () => {
      const savedLocale = localStorage.getItem('locale') || 'zh-CN'
      const antdLocale = savedLocale === 'zh-TW' ? zhTW : savedLocale === 'en-US' ? enUS : zhCN
      setLocale(antdLocale)
    }

    window.addEventListener('storage', handleStorageChange)
    // 监听自定义事件（当语言切换时触发）
    window.addEventListener('localeChanged', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('localeChanged', handleStorageChange)
    }
  }, [])

  return (
    <ConfigProvider locale={locale}>
      {children}
    </ConfigProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DynamicConfigProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </DynamicConfigProvider>
  </React.StrictMode>,
)
