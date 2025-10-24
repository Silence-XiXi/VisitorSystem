// 测试邮件API的简单脚本
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testEmailAPI() {
  try {
    console.log('测试邮件API...');
    
    // 测试获取所有邮件任务状态
    console.log('\n1. 测试获取所有邮件任务状态...');
    try {
      const response = await axios.get(`${BASE_URL}/email/jobs-status`, {
        headers: {
          'Authorization': 'Bearer your-token-here', // 需要替换为有效的token
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ 获取所有邮件任务状态成功:', response.data);
    } catch (error) {
      console.log('❌ 获取所有邮件任务状态失败:', error.response?.data || error.message);
    }
    
    // 测试获取特定任务进度
    console.log('\n2. 测试获取特定任务进度...');
    try {
      const jobId = 'email_1761186079906_i4qw6e31e';
      const response = await axios.get(`${BASE_URL}/email/job-progress/${jobId}`, {
        headers: {
          'Authorization': 'Bearer your-token-here', // 需要替换为有效的token
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ 获取任务进度成功:', response.data);
    } catch (error) {
      console.log('❌ 获取任务进度失败:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

testEmailAPI();
