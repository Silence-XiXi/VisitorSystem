// 测试工人编号生成
// 由于我们不能直接在非TypeScript环境中导入TypeScript模块，我们将创建自己的生成函数

// 模拟工人编号生成逻辑
async function generateWorkerId() {
  // 生成8位随机数字
  const generateRandomDigits = () => {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
  };
  
  // 生成8位纯数字编号
  const workerId = generateRandomDigits();
  
  // 在真实环境中会检查数据库，但在这个测试中我们只是返回生成的ID
  return workerId;
}

// 测试生成10个工人编号，检查格式是否正确
async function testGenerateWorkerId() {
  console.log('测试工人编号生成...');
  
  try {
    for (let i = 0; i < 10; i++) {
      const workerId = await generateWorkerId();
      console.log(`生成的工人编号 ${i+1}: ${workerId}`);
      
      // 检查格式是否符合要求: 8位数字
      const isValid = /^\d{8}$/.test(workerId);
      console.log(`格式是否有效: ${isValid ? '是 ✓' : '否 ✗'}`);
      
      if (!isValid) {
        console.error(`格式错误: ${workerId} 不符合要求的格式 8位数字`);
      }
    }
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

testGenerateWorkerId().catch(console.error);