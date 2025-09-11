# 分判商登录调试指南

## 问题描述
分判商账号登录无法跳转页面

## 修复内容

### 1. DistributorLayout 组件修复
**问题**: 角色检查逻辑在组件渲染时执行，可能导致状态更新不及时
**修复**: 将角色检查移到 `useEffect` 中，确保在状态更新后执行

```typescript
// 修复前
if (!user || user.role !== 'subcontractor') {
  return <Navigate to="/login" replace />
}

// 修复后
useEffect(() => {
  if (user && user.role !== 'subcontractor') {
    navigate('/login', { replace: true })
  }
}, [user, navigate])
```

### 2. 路由配置修复
**问题**: DistributorLayout 内部路由配置不匹配
**修复**: 修正默认路由重定向

```typescript
// 修复前
<Route path="/" element={<Navigate to="/distributor/workers" replace />} />

// 修复后  
<Route path="/" element={<Navigate to="/workers" replace />} />
```

### 3. 调试信息添加
在登录页面添加了控制台日志，帮助诊断问题：

```typescript
const result = await login(values.username, values.password)
console.log('Login result:', result) // 调试信息
if (result.success) {
  message.success('登录成功！')
  if (result.role === 'subcontractor') {
    console.log('Navigating to distributor workers page') // 调试信息
    navigate('/distributor/workers')
  }
}
```

## 测试步骤

### 1. 分判商登录测试
1. 访问 `/login` 页面
2. 输入分判商账号：
   - 用户名: `bjadmin`
   - 密码: `123456`
3. 点击登录按钮
4. 检查控制台输出：
   - 应该显示: `Login result: {success: true, role: 'subcontractor'}`
   - 应该显示: `Navigating to distributor workers page`
5. 验证页面跳转到工人管理页面

### 2. 管理员登录测试
1. 访问 `/login` 页面
2. 输入管理员账号：
   - 用户名: `admin`
   - 密码: `123456`
3. 点击登录按钮
4. 检查控制台输出：
   - 应该显示: `Login result: {success: true, role: 'admin'}`
   - 应该显示: `Navigating to dashboard`
5. 验证页面跳转到系统概览页面

## 预期结果

### 分判商登录成功
- 显示"登录成功！"消息
- 自动跳转到 `/distributor/workers` 页面
- 页面显示工人管理界面
- 顶部显示公司名称（如"北京建筑公司"）

### 管理员登录成功
- 显示"登录成功！"消息
- 自动跳转到 `/dashboard` 页面
- 页面显示系统概览界面

## 故障排除

如果仍然无法跳转，请检查：

1. **控制台错误**: 打开浏览器开发者工具，查看控制台是否有错误信息
2. **网络请求**: 检查网络面板，确认没有请求失败
3. **本地存储**: 检查 localStorage 中是否有用户信息
4. **路由状态**: 确认 React Router 状态正常

## 测试账号

### 分判商账号
| 用户名 | 密码 | 公司名称 |
|--------|------|----------|
| `bjadmin` | `123456` | 北京建筑公司 |
| `shadmin` | `123456` | 上海建设集团 |
| `gzadmin` | `123456` | 广州工程公司 |
| `szadmin` | `123456` | 深圳建筑集团 |
| `cdadmin` | `123456` | 成都建设公司 |

### 管理员账号
| 用户名 | 密码 | 说明 |
|--------|------|------|
| `admin` | `123456` | 系统管理员 |
| `superadmin` | `super123` | 超级管理员 |
| `manager1` | `mgr123` | 项目经理1 |
| `manager2` | `mgr456` | 项目经理2 |
| `system` | `sys123` | 系统账号 |
