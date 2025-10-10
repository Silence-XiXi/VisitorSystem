# 前端API地址配置说明

## 概述

本项目支持多种环境下的API地址配置，包括开发环境、生产环境Docker部署等场景。

## 配置方式

### 1. 环境变量配置（推荐）

通过设置 `VITE_API_BASE_URL` 环境变量来配置API地址：

```bash
# 开发环境
export VITE_API_BASE_URL=http://localhost:3001

# 生产环境 - Docker网络访问
export VITE_API_BASE_URL=http://visitor-backend-blue:3001

# 生产环境 - 通过nginx代理
export VITE_API_BASE_URL=http://localhost/api
```

### 2. 使用配置文件

项目提供了多个环境配置文件：

- `env.development` - 开发环境配置
- `env.production` - 生产环境配置
- `env.example` - 配置示例

使用方式：
```bash
# 开发环境
cp env.development .env

# 生产环境
cp env.production .env
```

### 3. Docker Compose配置

在 `docker-compose.blue.yml` 和 `docker-compose.green.yml` 中，可以通过构建参数传递API地址：

```yaml
frontend-blue:
  build:
    context: .
    dockerfile: docker/frontend/Dockerfile
    args:
      - VITE_API_BASE_URL=${VITE_API_BASE_URL:-http://visitor-backend-blue:3001}
```

## 自动检测机制

前端代码具有智能检测机制，会按以下优先级选择API地址：

1. **环境变量** - 如果设置了 `VITE_API_BASE_URL`，优先使用
2. **Nginx代理检测** - 检测到端口9017、8081、8082等，自动使用当前访问地址+`/api`路径
3. **本地开发** - 检测到localhost时使用 `http://localhost:3001`
4. **跨设备访问** - 使用当前访问的主机地址+3001端口，支持跨设备访问

## 部署场景

### 开发环境
```bash
# 本地开发，后端运行在3001端口
VITE_API_BASE_URL=http://localhost:3001
```

### Docker生产环境（通过Nginx代理）
```bash
# 推荐：无需设置环境变量，前端会自动检测
# 访问 http://192.168.1.100:9017 时，API自动使用 http://192.168.1.100:9017/api

# 如果需要强制指定（不推荐，会限制跨设备访问）
VITE_API_BASE_URL=http://your-server-ip:9017/api
```

### 跨设备访问示例
```bash
# 服务器IP: 192.168.1.100
# 访问地址: http://192.168.1.100:9017
# API自动使用: http://192.168.1.100:9017/api

# 支持手机、平板、其他电脑等设备访问
```

## 优势

1. **跨设备支持** - 自动适配访问地址，支持手机、平板、其他电脑访问
2. **灵活性** - 支持多种部署场景和网络环境
3. **自动化** - 智能检测环境，减少手动配置
4. **开发友好** - 开发环境自动使用localhost
5. **生产就绪** - 生产环境通过Nginx代理，部署更稳定
6. **网络兼容** - 支持内网、外网、不同IP地址访问

## 注意事项

1. 环境变量在构建时注入，修改后需要重新构建镜像
2. Docker网络访问需要确保容器在同一网络中
3. 开发环境建议使用localhost访问，便于调试
4. 生产环境建议使用容器名访问，提高部署灵活性
