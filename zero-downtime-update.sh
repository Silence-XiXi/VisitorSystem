#!/bin/bash

# 访客系统零停机更新脚本
# 使用方法: ./zero-downtime-update.sh [blue|green]
# 参数说明: blue - 将流量切换到蓝色环境，green - 将流量切换到绿色环境

# 判断参数
if [ "$1" != "blue" ] && [ "$1" != "green" ]; then
  echo "参数错误：请使用 blue 或 green 参数指定要切换的环境"
  echo "使用方法: ./zero-downtime-update.sh [blue|green]"
  exit 1
fi

TARGET_ENV=$1
CURRENT_ENV=""
OTHER_ENV=""

# 获取当前激活的环境
if grep -q "server backend-green" nginx/conf.d/default.conf && ! grep -q "#.*server backend-green" nginx/conf.d/default.conf; then
  CURRENT_ENV="green"
  OTHER_ENV="blue"
else
  CURRENT_ENV="blue"
  OTHER_ENV="green"
fi

echo "当前环境: $CURRENT_ENV"
echo "目标环境: $TARGET_ENV"

# 如果要切换的环境已经是当前环境，则无需操作
if [ "$CURRENT_ENV" == "$TARGET_ENV" ]; then
  echo "目标环境 $TARGET_ENV 已是当前活动环境，无需切换"
  exit 0
fi

echo "开始零停机更新流程..."

# 1. 拉取最新代码
echo "1. 拉取最新代码..."
git pull

# 2. 构建新版本服务
echo "2. 构建 $TARGET_ENV 环境..."
docker-compose -f blue-green-deployment.yml build backend-$TARGET_ENV frontend-$TARGET_ENV

# 3. 启动或重启目标环境的服务
echo "3. 启动 $TARGET_ENV 环境服务..."
docker-compose -f blue-green-deployment.yml up -d --no-deps backend-$TARGET_ENV frontend-$TARGET_ENV

# 4. 等待目标环境服务启动
echo "4. 等待服务启动..."
sleep 10

# 5. 检查目标环境服务是否正常运行
echo "5. 检查服务状态..."
if ! docker ps | grep -q "visitor-system-backend-$TARGET_ENV" || ! docker ps | grep -q "visitor-system-frontend-$TARGET_ENV"; then
  echo "错误: $TARGET_ENV 环境服务未能正常启动，中止切换"
  exit 1
fi

# 6. 更新Nginx配置，将流量切换到目标环境
echo "6. 更新Nginx配置，切换流量到 $TARGET_ENV 环境..."
# 修改配置文件，启用目标环境，停用当前环境
sed -i "s/server backend-$TARGET_ENV:3000;/server backend-$TARGET_ENV:3000;/g" nginx/conf.d/default.conf
sed -i "s/server backend-$OTHER_ENV:3000;/# server backend-$OTHER_ENV:3000;/g" nginx/conf.d/default.conf

sed -i "s/server frontend-$TARGET_ENV:80;/server frontend-$TARGET_ENV:80;/g" nginx/conf.d/default.conf
sed -i "s/server frontend-$OTHER_ENV:80;/# server frontend-$OTHER_ENV:80;/g" nginx/conf.d/default.conf

# 7. 重新加载Nginx配置
echo "7. 重新加载Nginx配置..."
docker-compose -f blue-green-deployment.yml exec nginx nginx -s reload

echo "流量已成功切换到 $TARGET_ENV 环境"

# 8. 验证切换是否成功
echo "8. 验证切换结果..."
echo "请访问系统确认功能是否正常"
echo "如有问题，可以通过以下命令回滚: ./zero-downtime-update.sh $CURRENT_ENV"

# 可选：停止非活动环境的服务以节省资源
read -p "是否停止 $OTHER_ENV 环境服务以节省资源? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
  echo "停止 $OTHER_ENV 环境服务..."
  docker-compose -f blue-green-deployment.yml stop backend-$OTHER_ENV frontend-$OTHER_ENV
fi

echo "零停机更新完成!"
