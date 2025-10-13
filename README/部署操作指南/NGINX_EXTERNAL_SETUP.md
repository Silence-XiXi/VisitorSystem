# 外部Nginx配置指南

## 📋 概述

本指南将帮助您配置使用宿主机外部的Nginx服务，而不是Docker容器内的Nginx。

## 🔧 安装Nginx

### Windows系统

#### 方法1：使用Chocolatey（推荐）
```powershell
# 安装Chocolatey（如果未安装）
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# 安装Nginx
choco install nginx
```

#### 方法2：手动下载
1. 访问 [Nginx官网](http://nginx.org/en/download.html)
2. 下载Windows版本
3. 解压到 `C:\nginx\`
4. 将 `nginx-external.conf` 复制到 `C:\nginx\conf\nginx.conf`

### Linux系统

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install nginx
```

#### CentOS/RHEL
```bash
sudo yum install nginx
# 或
sudo dnf install nginx
```

## 📁 配置文件部署

### Windows
```powershell
# 复制配置文件
Copy-Item "nginx-external.conf" "C:\nginx\conf\nginx.conf" -Force

# 启动Nginx
C:\nginx\nginx.exe
```

### Linux
```bash
# 复制配置文件
sudo cp nginx-external.conf /etc/nginx/sites-available/visitor-system
sudo ln -s /etc/nginx/sites-available/visitor-system /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 启动Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## 🚀 启动服务

### 1. 启动Docker服务（不包含Nginx）
```powershell
# 启动基础服务
docker-compose -f docker-compose.base.yml up -d

# 启动蓝环境
docker-compose -f docker-compose.blue.yml up -d

# 启动绿环境
docker-compose -f docker-compose.green.yml up -d
```

### 2. 启动外部Nginx
```powershell
# Windows
C:\nginx\nginx.exe

# Linux
sudo systemctl start nginx
```

### 3. 验证服务
```powershell
# 检查端口占用
netstat -an | findstr ":80"

# 测试访问
Invoke-WebRequest -Uri "http://localhost" -UseBasicParsing
```

## 🔄 环境切换

### 使用脚本切换
```powershell
# 切换到蓝环境
.\switch-nginx-env.ps1 blue

# 切换到绿环境
.\switch-nginx-env.ps1 green

# 查看状态
.\switch-nginx-env.ps1 status
```

### 手动切换
1. 编辑 `nginx-external.conf`
2. 修改 `upstream current_backend` 和 `upstream current_frontend`
3. 重新加载Nginx配置

## 📊 端口分配

| 服务 | 端口 | 说明 |
|------|------|------|
| 外部Nginx | 80 | 主入口 |
| 蓝环境后端 | 3001 | Docker容器 |
| 蓝环境前端 | 3002 | Docker容器 |
| 绿环境后端 | 3003 | Docker容器 |
| 绿环境前端 | 3004 | Docker容器 |
| 蓝环境直接访问 | 8080 | 可选 |
| 绿环境直接访问 | 8081 | 可选 |

## 🛠️ 故障排除

### 1. 端口冲突
```powershell
# 检查端口占用
netstat -an | findstr ":80"

# 停止占用端口的服务
taskkill /F /IM nginx.exe
```

### 2. 配置文件错误
```powershell
# 测试Nginx配置
nginx -t

# 查看错误日志
Get-Content C:\nginx\logs\error.log
```

### 3. 服务无法访问
```powershell
# 检查Docker容器状态
docker ps

# 检查端口映射
docker port visitor-backend-blue
docker port visitor-frontend-blue
```

## 🔧 高级配置

### SSL/HTTPS支持
在 `nginx-external.conf` 中添加：
```nginx
server {
    listen 443 ssl;
    server_name localhost;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # 其他配置...
}
```

### 负载均衡
```nginx
upstream current_backend {
    server 127.0.0.1:3001 weight=3;
    server 127.0.0.1:3003 weight=1;
    keepalive 32;
}
```

### 缓存配置
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 📈 性能优化

### 1. 启用Gzip压缩
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

### 2. 连接保持
```nginx
upstream current_backend {
    server 127.0.0.1:3001;
    keepalive 32;
}
```

### 3. 缓存配置
```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=10g inactive=60m;
```

## 🎯 优势

1. **性能提升**：外部Nginx性能更好
2. **资源节省**：减少Docker容器数量
3. **管理简化**：统一的Nginx管理
4. **扩展性**：更容易添加SSL、缓存等功能
5. **监控**：更好的日志和监控支持

## ⚠️ 注意事项

1. 确保Docker容器端口映射正确
2. 定期备份Nginx配置文件
3. 监控Nginx和Docker服务状态
4. 配置适当的日志轮转
5. 定期更新Nginx版本
