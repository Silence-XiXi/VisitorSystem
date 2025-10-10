# 自定义Adminer Dockerfile
FROM adminer:latest

# 安装必要的工具
USER root
RUN apk add --no-cache gettext

# 创建自定义启动脚本
RUN echo '#!/bin/sh' > /usr/local/bin/start-adminer.sh && \
    echo 'export ADMINER_DEFAULT_SERVER="postgres"' >> /usr/local/bin/start-adminer.sh && \
    echo 'export ADMINER_DESIGN="pepa-linha-dark"' >> /usr/local/bin/start-adminer.sh && \
    echo 'exec php -S 0.0.0.0:8090 -t /var/www/html' >> /usr/local/bin/start-adminer.sh && \
    chmod +x /usr/local/bin/start-adminer.sh

# 切换到非root用户
USER adminer

# 暴露端口8090
EXPOSE 8090

# 使用自定义启动脚本
CMD ["/usr/local/bin/start-adminer.sh"]
