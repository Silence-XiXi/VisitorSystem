FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm install

# 复制源代码
COPY . .

# 生成Prisma客户端
RUN npx prisma generate

# 构建应用
RUN npm run build

# 检查构建是否成功
RUN ls -la dist/ && echo "构建完成，检查dist目录"

# 暴露端口
EXPOSE 3000

# 检查package.json中的启动命令
RUN cat package.json | grep start:prod || echo "未找到start:prod命令"

# 启动命令 (确保dist/main.js存在时使用)
CMD if [ -f dist/main.js ]; then \
      npm run start:prod; \
    elif [ -f dist/main ]; then \
      node dist/main; \
    elif [ -f dist/src/main.js ]; then \
      node dist/src/main.js; \
    else \
      echo "找不到应用入口点，请检查构建配置" && exit 1; \
    fi
