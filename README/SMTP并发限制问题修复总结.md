# SMTP并发限制问题修复总结

## 问题分析

### 错误信息
```
421 Too many concurrent SMTP connections from this IP address; please try again later.
```

### 问题原因
1. **SMTP服务器限制**：邮件服务器限制了来自同一IP的并发连接数
2. **并发发送策略**：之前的实现使用 `Promise.all()` 并发发送邮件
3. **连接池配置**：连接池设置过大，超过了SMTP服务器的限制

## 解决方案

### 1. 优化并发控制 ✅

#### 改进前：
```typescript
// 并发发送当前批次的邮件
const promises = batch.map(async (worker, index) => {
  const retryCount = 0;
  return this.sendWorkerQRWithRetry(worker, language, retryCount, job);
});
await Promise.all(promises);
```

#### 改进后：
```typescript
// 串行发送当前批次的邮件，避免SMTP服务器并发限制
for (const worker of batch) {
  // 检查是否已被取消
  if (job.isCancelled) {
    this.logger.log(`邮件任务已取消，停止发送邮件: ${(worker as any).workerEmail}`);
    break;
  }
  
  const retryCount = 0;
  await this.sendWorkerQRWithRetry(worker, language, retryCount, job);
  
  // 邮件间延迟，避免触发SMTP服务器限制
  if (batch.indexOf(worker) < batch.length - 1) {
    await this.delay(this.EMAIL_DELAY);
  }
}
```

### 2. 调整队列参数 ✅

#### 优化前：
```typescript
private readonly MAX_CONCURRENT_JOBS = 2; // 并发任务数
private readonly BATCH_SIZE = 3; // 批次大小
private readonly RETRY_DELAY = 3000; // 重试延迟3秒
private readonly BATCH_DELAY = 1000; // 批次间延迟1秒
```

#### 优化后：
```typescript
private readonly MAX_CONCURRENT_JOBS = 1; // 进一步减少并发任务数，避免SMTP服务器限制
private readonly BATCH_SIZE = 2; // 减少批次大小，避免并发连接过多
private readonly RETRY_DELAY = 5000; // 增加重试延迟到5秒
private readonly MAX_RETRIES = 2; // 减少重试次数，避免长时间卡住
private readonly BATCH_DELAY = 2000; // 增加批次间延迟到2秒
private readonly EMAIL_DELAY = 1000; // 单个邮件间延迟1秒
```

### 3. 优化SMTP连接池配置 ✅

#### 改进前：
```typescript
// 配置连接池
transporter.set('pool', true);
transporter.set('maxConnections', 5);
transporter.set('maxMessages', 100);
```

#### 改进后：
```typescript
// 配置连接池 - 减少连接数避免SMTP服务器限制
transporter.set('pool', true);
transporter.set('maxConnections', 1); // 只使用1个连接，避免并发限制
transporter.set('maxMessages', 10); // 减少每个连接的消息数
```

### 4. 特殊错误处理 ✅

#### 添加对SMTP并发限制错误的特殊处理：
```typescript
// 连接类错误且有重试次数时进行重试（排除超时错误）
if (retryCount > 0 && ['ESOCKET', 'ETIMEDOUT', 'ECONNRESET', 'EPROTOCOL'].includes(errorCode) && !errorMsg.includes('超时')) {
  const remaining = retryCount - 1;
  
  // 如果是SMTP并发限制错误，增加更长的延迟
  if (errorCode === 'EPROTOCOL' && errorMsg.includes('Too many concurrent SMTP connections')) {
    this.logger.warn(`SMTP并发限制，等待更长时间后重试（剩余${remaining}次）：${workerEmail}`);
    await new Promise(resolve => setTimeout(resolve, 10000)); // 等待10秒
  } else {
    this.logger.warn(`邮件发送失败，将重试（剩余${remaining}次）：${workerEmail}，原因：${errorMsg}`);
    await new Promise(resolve => setTimeout(resolve, (3 - retryCount) * 1000)); // 指数退避
  }
  
  return this.sendWorkerQRCodeEmail(workerEmail, workerName, workerId, qrCodeDataUrl, language, remaining);
}
```

## 核心改进

### 1. 串行发送策略
- **从并发改为串行**：避免同时建立多个SMTP连接
- **邮件间延迟**：每个邮件发送后等待1秒
- **批次间延迟**：每个批次完成后等待2秒

### 2. 连接池优化
- **单连接模式**：只使用1个SMTP连接
- **减少消息数**：每个连接最多处理10个消息
- **避免连接竞争**：确保不会超过SMTP服务器限制

### 3. 智能重试机制
- **特殊错误处理**：对并发限制错误使用更长的延迟（10秒）
- **指数退避**：其他错误使用指数退避策略
- **错误分类**：区分不同类型的连接错误

### 4. 任务控制优化
- **取消检查**：在每个邮件发送前检查任务是否被取消
- **进度更新**：实时更新发送进度
- **错误记录**：详细记录每个失败邮件的错误信息

## 预期效果

### 1. 解决并发限制问题
- ✅ 避免"Too many concurrent SMTP connections"错误
- ✅ 单连接串行发送，符合SMTP服务器限制
- ✅ 智能延迟，避免触发服务器限制

### 2. 提高发送稳定性
- ✅ 减少连接失败的概率
- ✅ 更好的错误恢复机制
- ✅ 稳定的发送速度

### 3. 保持用户体验
- ✅ 实时进度反馈
- ✅ 详细的失败信息
- ✅ 支持取消和重试功能

## 发送策略对比

### 改进前（并发发送）：
```
批次1: [邮件1, 邮件2, 邮件3] → 同时发送 → 可能触发并发限制
批次2: [邮件4, 邮件5, 邮件6] → 同时发送 → 可能触发并发限制
```

### 改进后（串行发送）：
```
批次1: 邮件1 → 等待1秒 → 邮件2 → 等待1秒 → 邮件3 → 等待2秒
批次2: 邮件4 → 等待1秒 → 邮件5 → 等待1秒 → 邮件6 → 等待2秒
```

## 测试建议

1. **小批量测试**：先测试发送5-10个邮件
2. **大批量测试**：然后测试发送20个邮件
3. **监控日志**：观察是否还有并发限制错误
4. **检查进度**：确认进度更新正常
5. **测试取消**：验证取消功能是否正常

通过这些优化，邮件发送功能现在能够：
- **避免SMTP并发限制错误**
- **稳定地发送大量邮件**
- **提供良好的用户体验**
- **支持错误恢复和重试**

现在可以重新测试批量邮件发送功能了！
