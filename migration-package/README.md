# 访客管理系统迁移包

## 使用方法

1. 将整个文件夹复制到新服务器
2. 修改 `.env` 文件中的配置
3. 运行部署脚本：
   ```bash
   ./deploy-on-new-server.sh
   ```

## 文件说明

- `docker-compose.*.yml` - Docker Compose 配置文件
- `deploy.sh` - 原始部署脚本
- `deploy-on-new-server.sh` - 新服务器部署脚本
- `.env` - 环境变量配置
- `docker/` - Docker 相关文件
- `visitorSystem-backend/` - 后端代码
- `visitorSystem-frontend/` - 前端代码

## 注意事项

1. 确保新服务器已安装 Docker 和 Docker Compose
2. 修改 `.env` 文件中的配置信息
3. 确保端口 80, 443, 5432, 6379, 8080 未被占用
4. 如果使用 HTTPS，请配置 SSL 证书

## 访问地址

- 主应用: http://localhost
- 数据库管理: http://localhost:8080
- 后端 API: http://localhost:3001
- 前端: http://localhost:3002
