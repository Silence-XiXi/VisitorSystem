# 前端 Dockerfile
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY visitorSystem-frontend/package*.json ./

# 安装所有依赖（包括开发依赖）
RUN npm install

# 复制源代码
COPY visitorSystem-frontend/ .

# 设置环境变量
ENV VITE_API_BASE_URL=http://localhost:3001

# 构建应用（跳过TypeScript检查）
RUN npx vite build

# 生产阶段
FROM nginx:alpine

# 复制构建产物到 nginx 目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 nginx 配置
COPY docker/nginx/frontend.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
