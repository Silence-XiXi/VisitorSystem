# 前端 Dockerfile
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY visitorSystem-frontend/package*.json ./

# 安装所有依赖（包括开发依赖）
RUN npm install

# 复制源代码
COPY visitorSystem-frontend/ .

# 接受构建参数
ARG VITE_API_BASE_URL
ARG NODE_ENV=production

# 设置环境变量（支持构建时传入）
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV NODE_ENV=${NODE_ENV}

# 构建应用（跳过TypeScript检查）
RUN npx vite build

# 生产阶段
FROM nginx:alpine

# 复制构建产物到 nginx 目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 nginx 配置
COPY docker/nginx/frontend.conf /etc/nginx/conf.d/default.conf

# 修改nginx配置监听3002端口
RUN sed -i 's/listen 80;/listen 3002;/' /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 3002

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
