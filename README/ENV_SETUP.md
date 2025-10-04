# 环境变量配置说明

本项目包含前端和后端两个部分，每个部分都有对应的环境变量配置文件。

## 后端环境变量配置

### 文件位置
- 配置文件：`visitorSystem-backend/.env`
- 示例文件：`visitorSystem-backend/.env.example`

### 配置说明

#### 数据库配置
```env
DATABASE_URL="postgresql://username:password@localhost:5432/visitor_system?schema=public"
```
- 配置PostgreSQL数据库连接
- 请根据实际数据库信息修改用户名、密码、主机和端口

#### JWT配置
```env
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"
```
- `JWT_SECRET`: JWT签名密钥，生产环境请使用强密码
- `JWT_EXPIRES_IN`: Token过期时间，默认为7天

#### Redis配置
```env
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""
REDIS_URL="redis://localhost:6379"
```
- 配置Redis缓存服务
- 如果Redis有密码，请填写`REDIS_PASSWORD`

#### 应用配置
```env
PORT=3000
NODE_ENV="development"
```
- `PORT`: 后端服务端口，默认为3000
- `NODE_ENV`: 运行环境，development/production

#### CORS配置
```env
CORS_ORIGIN="http://localhost:3001,http://localhost:3000,http://127.0.0.1:3001,http://127.0.0.1:3000"
```
- 配置允许跨域的前端地址

## 前端环境变量配置

### 文件位置
- 配置文件：`visitorSystem-frontend/.env`
- 示例文件：`visitorSystem-frontend/.env.example`

### 配置说明

#### API配置
```env
VITE_API_BASE_URL="http://localhost:3000"
```
- 后端API的基础URL
- 开发环境通常为localhost:3000
- 生产环境需要修改为实际的服务器地址

#### 应用配置
```env
VITE_APP_TITLE="访客管理系统"
VITE_APP_VERSION="1.0.0"
VITE_DEV_MODE="true"
```
- `VITE_APP_TITLE`: 应用标题
- `VITE_APP_VERSION`: 应用版本
- `VITE_DEV_MODE`: 开发模式标识

## 使用方法

### 1. 复制示例文件
```bash
# 后端
cd visitorSystem-backend
cp .env.example .env

# 前端
cd visitorSystem-frontend
cp .env.example .env
```

### 2. 修改配置
根据实际环境修改`.env`文件中的配置值。

### 3. 重启服务
修改环境变量后需要重启服务才能生效。

## 注意事项

1. **安全性**：`.env`文件包含敏感信息，已被`.gitignore`忽略，不会提交到版本控制
2. **生产环境**：生产环境部署时，请确保使用强密码和正确的服务器地址
3. **备份**：建议备份`.env.example`文件作为配置模板
4. **权限**：确保`.env`文件只有项目所有者有读写权限

## 环境变量优先级

1. 系统环境变量
2. `.env.local`（如果存在）
3. `.env.development`（开发环境）
4. `.env`（默认）
5. 代码中的默认值
