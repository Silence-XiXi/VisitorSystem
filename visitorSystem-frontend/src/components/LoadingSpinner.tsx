import React from 'react'

interface LoadingSpinnerProps {
  text?: string
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ text }) => {
  // 从localStorage获取保存的语言设置，默认为简体中文
  const getLoadingText = () => {
    try {
      const savedLocale = localStorage.getItem('locale')
      
      if (savedLocale) {
        switch (savedLocale) {
          case 'zh-CN':
            return '加载中...'
          case 'zh-TW':
            return '載入中...'
          case 'en-US':
            return 'Loading...'
        }
      }
      
      // 如果没有保存的语言设置，尝试从浏览器语言检测
      const browserLang = navigator.language || (navigator as { userLanguage?: string }).userLanguage
      
      if (browserLang) {
        if (browserLang.startsWith('zh-TW') || browserLang.startsWith('zh-HK')) {
          return '載入中...'
        } else if (browserLang.startsWith('zh')) {
          return '加载中...'
        } else if (browserLang.startsWith('en')) {
          return 'Loading...'
        }
      }
      
      // 默认返回简体中文
      return '加载中...'
    } catch (error) {
      return '加载中...'
    }
  }

  const displayText = text || getLoadingText()

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontSize: '16px',
      color: '#666'
    }}>
      {displayText}
    </div>
  )
}

export default LoadingSpinner
