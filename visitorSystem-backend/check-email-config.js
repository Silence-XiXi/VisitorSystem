const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';

async function checkEmailConfig() {
  try {
    console.log('检查邮件配置...');
    
    // 登录
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.access_token;
    console.log('登录成功');
    
    // 检查所有邮件配置
    const configs = ['EMAIL_ADDRESS', 'EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_PASSWORD'];
    
    for (const configKey of configs) {
      try {
        const configResponse = await axios.get(`${API_BASE_URL}/system-config/${configKey}?decrypt=true`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const value = configResponse.data.config_value;
        if (configKey === 'EMAIL_PASSWORD') {
          console.log(`${configKey}: ${value ? '***已配置***' : '未配置'}`);
        } else {
          console.log(`${configKey}: ${value}`);
        }
      } catch (error) {
        console.log(`${configKey}: 获取失败 - ${error.response?.data?.message || error.message}`);
      }
    }
    
  } catch (error) {
    console.error('检查失败:', error.message);
  }
}

checkEmailConfig();
