# 分判商密码重置邮件功能测试

## 功能说明
在 `/dashboard/admin-sites` 页面重置分判商密码后，系统会自动发送邮件通知分判商。邮件语言会根据当前系统选择的语言自动切换。

## 邮件内容
根据系统语言设置，邮件内容会自动切换：

### 中文简体 (zh-CN)
```
您好，${contactName}：
您的「${distributorName}」工人信息管理系统的账号「${username}」已由管理员将密码重置为：「Pass@123」，请登录后及时修改密码！
登录链接：http://localhost:3002/login
```

### 中文繁体 (zh-TW)
```
您好，${contactName}：
您的「${distributorName}」工人信息管理系統的帳號「${username}」已由管理員將密碼重置為：「Pass@123」，請登錄後及時修改密碼！
登錄鏈接：http://localhost:3002/login
```

### 英文 (en-US)
```
Hello, ${contactName}:
Your "${distributorName}" Worker Management System account password has been reset by the administrator.
Username: ${username}
New Password: ${password}
Login URL: http://localhost:3002/login
```

## 实现的功能

### 1. 后端实现
- ✅ 在 `EmailService` 中添加了 `getDistributorPasswordResetTemplate` 方法
- ✅ 在 `EmailService` 中添加了 `sendDistributorPasswordResetEmail` 方法
- ✅ 在 `AdminService` 的 `resetDistributorPassword` 方法中集成了邮件发送功能
- ✅ 更新了 `AdminModule` 以导入 `EmailModule` 和 `SystemConfigModule`
- ✅ 支持从系统配置获取语言设置
- ✅ 支持从前端传递语言参数

### 2. 前端实现
- ✅ 修改了 `apiService.resetDistributorPassword` 方法，支持传递语言参数
- ✅ 修改了 `AdminSites` 页面，传递当前系统语言设置
- ✅ 更新了 `AdminController` 和 `AdminService`，支持接收语言参数

### 3. 邮件模板特性
- 支持多语言（中文简体、繁体、英文）
- 包含分判商名称、联系人姓名、用户名、新密码和登录链接
- 美观的HTML格式
- 安全提示信息
- **自动语言切换**：根据当前系统语言设置自动选择邮件语言

### 4. 语言优先级
1. **前端传递的语言参数**（最高优先级）
2. **系统配置中的 `SYSTEM_LANGUAGE` 设置**
3. **默认中文简体**（`zh-CN`）

### 5. 错误处理
- 邮件发送失败不会影响密码重置操作
- 详细的日志记录
- 重试机制（最多重试2次）

## 测试步骤

### 基础功能测试
1. 确保邮件服务配置正确（在系统配置中设置EMAIL_ADDRESS、EMAIL_HOST、EMAIL_PORT、EMAIL_PASSWORD）
2. 在 `/dashboard/admin-sites` 页面找到分判商列表
3. 点击分判商的"重置密码"按钮
4. 确认重置操作
5. 检查分判商的邮箱是否收到密码重置邮件

### 多语言功能测试
1. **测试中文简体**：
   - 将系统语言设置为中文简体
   - 重置分判商密码
   - 验证收到的邮件是中文简体版本

2. **测试中文繁体**：
   - 将系统语言设置为中文繁体
   - 重置分判商密码
   - 验证收到的邮件是中文繁体版本

3. **测试英文**：
   - 将系统语言设置为英文
   - 重置分判商密码
   - 验证收到的邮件是英文版本

### 系统配置语言测试
1. 在系统配置中设置 `SYSTEM_LANGUAGE` 为 `zh-TW`
2. 重置分判商密码
3. 验证邮件使用繁体中文（即使前端语言设置不同）

## 注意事项

- 分判商必须有有效的邮箱地址才能收到邮件
- 登录链接使用环境变量 `FRONTEND_URL`，默认为 `http://localhost:3002/login`
- 新密码固定为 `Pass@123`
- 邮件发送是异步的，不会阻塞密码重置操作

## 环境变量配置

确保在 `.env` 文件中配置：
```
FRONTEND_URL=http://localhost:3002
EMAIL_ADDRESS=your-email@example.com
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_PASSWORD=your-email-password
```

## 系统配置项

可以通过系统配置设置默认语言：
- **配置键**: `SYSTEM_LANGUAGE`
- **可选值**: `zh-CN`（中文简体）、`zh-TW`（中文繁体）、`en-US`（英文）
- **默认值**: `zh-CN`

## 技术实现细节

### 语言选择逻辑
```typescript
// 优先级：前端参数 > 系统配置 > 默认值
const systemLanguage = language || 
  await this.systemConfigService.getConfigValue('SYSTEM_LANGUAGE') || 
  'zh-CN';
```

### 前端语言传递
```typescript
// 从前端传递当前语言设置
const result = await apiService.resetDistributorPassword(record.id, locale)
```

### 邮件模板选择
```typescript
// 根据语言选择对应的邮件模板
const template = this.getDistributorPasswordResetTemplate(
  systemLanguage, 
  distributorName, 
  contactName, 
  username, 
  password, 
  loginUrl
);
```
