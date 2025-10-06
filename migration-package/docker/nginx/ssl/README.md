# SSL 证书配置

## 证书文件说明

将以下证书文件放置在此目录中：

- `cert.pem` - SSL 证书文件
- `key.pem` - SSL 私钥文件

## 生成自签名证书（仅用于开发环境）

```bash
# 生成私钥
openssl genrsa -out key.pem 2048

# 生成证书
openssl req -new -x509 -key key.pem -out cert.pem -days 365 -subj "/C=CN/ST=Beijing/L=Beijing/O=Company/CN=localhost"
```

## 生产环境

生产环境请使用正式的 SSL 证书，如 Let's Encrypt 或其他 CA 机构颁发的证书。

## 注意事项

- 证书文件权限应设置为 600
- 私钥文件应妥善保管，不要提交到版本控制系统
- 建议将证书文件添加到 .gitignore 中
