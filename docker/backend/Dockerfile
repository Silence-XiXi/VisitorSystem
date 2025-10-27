# 后端 Dockerfile
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY visitorSystem-backend/package*.json ./

# 安装依赖（包括开发依赖用于构建）
RUN npm install

# 复制源代码
COPY visitorSystem-backend/ .

# 生成 Prisma client
RUN npx prisma generate

# 构建应用
RUN npm run build

# 生产阶段
FROM node:20-alpine

# 安装必要的系统依赖
RUN apk add --no-cache dumb-init

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY visitorSystem-backend/package*.json ./

# 安装生产依赖
RUN npm ci --only=production && npm cache clean --force

# 复制构建产物
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/health-check.js ./health-check.js

# 复制生成的 Prisma Client 文件
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# 修改所有权和权限（作为 root 用户执行）
RUN chown -R nestjs:nodejs node_modules/.prisma node_modules/@prisma && \
    chmod -R 755 node_modules/.prisma node_modules/@prisma

# 切换到非 root 用户
USER nestjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node health-check.js || exit 1

# 启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/main.js"]
