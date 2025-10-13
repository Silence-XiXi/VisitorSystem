# Windows 部署脚本使用指南

## 概述

由于Windows系统不支持直接执行shell脚本（`./deploy.sh`），我们提供了两个Windows兼容的部署脚本：

1. **PowerShell版本** (`deploy.ps1`) - 推荐使用
2. **批处理版本** (`deploy.bat`) - 备用方案

## 使用方法

### PowerShell版本 (推荐)

```powershell
# 部署蓝环境
.\deploy.ps1 blue

# 部署绿环境
.\deploy.ps1 green

# 切换到蓝环境
.\deploy.ps1 switch blue

# 切换到绿环境
.\deploy.ps1 switch green

# 查看系统状态
.\deploy.ps1 status

# 清理所有服务
.\deploy.ps1 cleanup

# 显示帮助信息
.\deploy.ps1 help
```

### 批处理版本 (备用)

```cmd
# 部署蓝环境
deploy.bat blue

# 部署绿环境
deploy.bat green

# 切换到蓝环境
deploy.bat switch blue

# 切换到绿环境
deploy.bat switch green

# 查看系统状态
deploy.bat status

# 清理所有服务
deploy.bat cleanup

# 显示帮助信息
deploy.bat help
```

## 执行策略问题解决

如果遇到PowerShell执行策略限制，可以使用以下方法：

### 方法1：临时允许执行
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 方法2：绕过执行策略
```powershell
PowerShell -ExecutionPolicy Bypass -File .\deploy.ps1 blue
```

### 方法3：使用批处理版本
如果PowerShell仍有问题，直接使用 `deploy.bat` 文件。

## 功能对比

| 功能 | PowerShell版本 | 批处理版本 |
|------|----------------|------------|
| 语法高亮 | ✅ | ❌ |
| 错误处理 | ✅ | ✅ |
| 彩色输出 | ✅ | ❌ |
| 跨平台兼容 | ✅ | ❌ |
| 执行速度 | 快 | 中等 |

## 注意事项

1. **Docker Desktop**: 确保已安装并启动Docker Desktop
2. **文件路径**: 脚本需要在项目根目录执行
3. **权限**: 确保有足够的权限执行Docker命令
4. **网络**: 确保网络连接正常，能够拉取Docker镜像

## 故障排除

### 常见问题

1. **"无法加载文件"错误**
   - 解决：使用 `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`

2. **"Docker未安装"错误**
   - 解决：安装Docker Desktop并确保服务正在运行

3. **"权限被拒绝"错误**
   - 解决：以管理员身份运行PowerShell或命令提示符

4. **"网络创建失败"错误**
   - 解决：检查Docker网络是否已存在，或手动删除后重试

### 手动执行命令

如果脚本执行失败，可以手动执行以下命令：

```powershell
# 检查Docker状态
docker --version
docker-compose --version

# 创建网络
docker network create visitor-network

# 启动基础服务
docker-compose -f docker-compose.base.yml up -d

# 部署蓝环境
docker-compose -f docker-compose.base.yml -f docker-compose.blue.yml up -d --build

# 启动Nginx
docker-compose -f docker-compose.nginx.yml up -d
```

## 推荐使用流程

1. 首次部署：`.\deploy.ps1 blue`
2. 更新版本：`.\deploy.ps1 green`
3. 切换流量：`.\deploy.ps1 switch green`
4. 回滚版本：`.\deploy.ps1 switch blue`
5. 查看状态：`.\deploy.ps1 status`
