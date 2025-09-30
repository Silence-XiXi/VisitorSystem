/*
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.163.com',
  port: 465, // 尝试465端口（SSL加密，比587更稳定）
  secure: true, // 465端口需设为true
  auth: {
    user: 'silence_xixi_ke@163.com',
    pass: 'CSrqjqeb49WDiJxh'
  },
  // 关键：增加超时设置，避免连接超时被强制关闭
  connectionTimeout: 5 * 60 * 1000, // 5分钟连接超时
  greetingTimeout: 30 * 1000, // 30秒问候超时
  socketTimeout: 5 * 60 * 1000, // 5分钟socket超时
  // 启用重试机制
  pool: true, // 使用连接池
  maxConnections: 1,
  maxMessages: 5
});

// 邮件内容（保持不变）
const mailOptions = {
  from: 'silence_xixi_ke@163.com',
  to: '1516567074@qq.com',
  subject: '测试邮件 - 修复连接中断问题',
  text: '尝试解决 Unexpected socket close 错误'
};

// 发送邮件（增加重试逻辑）
const sendWithRetry = async (options, retries = 3) => {
  try {
    const info = await transporter.sendMail(options);
    console.log('发送成功，消息ID：', info.messageId);
    return info;
  } catch (error) {
    console.error(`第 ${4 - retries} 次发送失败：`, error.message);
    if (retries > 1) {
      console.log(`等待2秒后重试...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return sendWithRetry(options, retries - 1);
    }
    console.error('所有重试均失败');
    throw error;
  }
};

// 执行发送
sendWithRetry(mailOptions);
*/

const nodemailer = require('nodemailer');

// 创建邮件传输器（使用你的配置）
const transporter = nodemailer.createTransport({
  host: 'smtp.163.com',
  port: 587, // 推荐587端口（TLS加密）
  secure: false, // 587端口需设为false
  requireTLS: true, // 强制启用TLS加密
  auth: {
    user: 'silence_xixi_ke@163.com', // 发件人邮箱
    pass: 'CSrqjqeb49WDiJxh' // 你的163邮箱授权码
  }
});

// 邮件内容配置
const mailOptions = {
  from: '"测试发送者" <silence_xixi_ke@163.com>', // 发件人信息（需与auth.user一致）
  to: '1516567074@qq.com', // 收件人QQ邮箱
  subject: '测试邮件 - 来自163邮箱', // 邮件主题
  text: '这是一封通过Node.js发送的测试邮件，从163邮箱发送到QQ邮箱。', // 纯文本内容
  html: '<p>这是一封通过<strong>Node.js</strong>发送的测试邮件</p><p>发件人：silence_xixi_ke@163.com</p><p>收件人：1516567074@qq.com</p>' // HTML内容（可选）
};

// 发送邮件
transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('邮件发送失败：', error.message);
    // 常见错误处理提示
    if (error.message.includes('Invalid login')) {
      console.error('可能原因：授权码错误或SMTP服务未开启');
    } else if (error.message.includes('connect ECONNREFUSED')) {
      console.error('可能原因：网络问题或端口被封锁');
    } else if (error.message.includes('self signed certificate')) {
      console.error('解决方案：添加 tls: { rejectUnauthorized: false } 到配置（仅测试用）');
    }
    return;
  }
  console.log('邮件发送成功！消息ID：', info.messageId);
  console.log('请查收QQ邮箱（包括垃圾箱）');
});
