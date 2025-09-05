# 登录调试指南

## 问题描述
使用 `bjadmin` / `123456` 登录仍然无法跳转页面

## 调试步骤

### 1. 打开浏览器开发者工具
1. 按 F12 或右键选择"检查"
2. 切换到 "Console" 标签页
3. 清除之前的日志

### 2. 尝试登录
1. 访问登录页面
2. 输入用户名: `bjadmin`
3. 输入密码: `123456`
4. 点击登录按钮

### 3. 查看控制台输出
应该看到以下日志：

```
Checking subcontractor accounts for: bjadmin 123456
Found subcontractor account: {username: "bjadmin", password: "123456", id: "1", name: "北京建筑公司"}
Setting user data: {id: "1", username: "bjadmin", role: "subcontractor"}
User data set, resolving with success
Login result: {success: true, role: "subcontractor"}
Navigating to distributor workers page
App - isAuthenticated: true user: {id: "1", username: "bjadmin", role: "subcontractor"}
DistributorLayout - User: {id: "1", username: "bjadmin", role: "subcontractor"}
```

### 4. 检查可能的问题

#### 问题1: 账号验证失败
如果看到：
```
Checking subcontractor accounts for: bjadmin 123456
Found subcontractor account: null
```
**解决方案**: 检查用户名和密码是否正确输入

#### 问题2: 状态更新失败
如果看到：
```
Login result: {success: false}
```
**解决方案**: 检查useAuth hook中的账号配置

#### 问题3: 路由跳转失败
如果看到：
```
Navigating to distributor workers page
```
但没有跳转，可能是路由配置问题

#### 问题4: 权限检查失败
如果看到：
```
DistributorLayout - User: {id: "1", username: "bjadmin", role: "subcontractor"}
User role is not subcontractor, redirecting to login
```
**解决方案**: 检查角色字符串是否匹配

### 5. 手动测试

#### 测试1: 直接访问URL
在浏览器地址栏输入: `http://localhost:5173/distributor/workers`
- 如果直接跳转到登录页面，说明路由保护正常
- 如果显示页面，说明路由配置有问题

#### 测试2: 检查本地存储
在开发者工具的 "Application" 标签页中：
1. 点击 "Local Storage"
2. 查看是否有 `user` 键
3. 检查值是否为: `{"id":"1","username":"bjadmin","role":"subcontractor"}`

#### 测试3: 检查网络请求
在开发者工具的 "Network" 标签页中：
1. 清除网络日志
2. 尝试登录
3. 查看是否有失败的请求

### 6. 常见解决方案

#### 解决方案1: 清除浏览器缓存
1. 按 Ctrl+Shift+Delete
2. 选择"所有时间"
3. 勾选"缓存的图像和文件"
4. 点击"清除数据"

#### 解决方案2: 重启开发服务器
```bash
# 停止当前服务器 (Ctrl+C)
# 重新启动
npm run dev
```

#### 解决方案3: 检查端口冲突
确保没有其他应用占用 5173 端口

### 7. 测试账号验证

使用以下账号进行测试：

#### 分判商账号
| 用户名 | 密码 | 预期结果 |
|--------|------|----------|
| `bjadmin` | `123456` | 跳转到工人管理页面 |
| `shadmin` | `123456` | 跳转到工人管理页面 |
| `wronguser` | `123456` | 登录失败 |

#### 管理员账号
| 用户名 | 密码 | 预期结果 |
|--------|------|----------|
| `admin` | `123456` | 跳转到系统概览页面 |
| `superadmin` | `super123` | 跳转到系统概览页面 |
| `wronguser` | `123456` | 登录失败 |

### 8. 如果问题仍然存在

请提供以下信息：
1. 浏览器控制台的完整日志
2. 网络请求的截图
3. 本地存储的内容
4. 使用的浏览器版本

### 9. 临时解决方案

如果问题持续存在，可以尝试：

1. **强制刷新**: Ctrl+F5
2. **无痕模式**: 使用浏览器的无痕/隐私模式
3. **不同浏览器**: 尝试 Chrome、Firefox、Edge
4. **清除所有数据**: 清除浏览器所有数据并重新登录
