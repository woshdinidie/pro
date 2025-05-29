# 🚀 答题小程序后端部署指南

## 📋 前置条件

### 服务器要求
- **操作系统**: Ubuntu 20.04+ / CentOS 8+
- **内存**: 最少 2GB，推荐 4GB+
- **CPU**: 最少 1核，推荐 2核+
- **硬盘**: 最少 20GB
- **网络**: 公网IP，支持域名解析

### 域名和SSL证书
- 已备案的域名
- SSL证书（可使用Let's Encrypt免费证书）

## 🛠️ 自动化部署（推荐）

### 1. 上传部署脚本
```bash
# 将 deploy.sh 上传到服务器
scp deploy.sh root@YOUR_SERVER_IP:/root/
```

### 2. 修改部署脚本配置
编辑 `deploy.sh` 文件中的配置变量：
```bash
vim /root/deploy.sh
```
修改以下变量：
- `GIT_REPO`: 你的Git仓库地址
- `PROJECT_NAME`: 项目名称（如果需要）
- `NODE_VERSION`: Node.js版本

### 3. 运行部署脚本
```bash
chmod +x /root/deploy.sh
sudo /root/deploy.sh
```

## 🔧 手动部署步骤

### 第一步：服务器环境准备

#### 1.1 系统更新
```bash
sudo apt update && sudo apt upgrade -y
```

#### 1.2 安装必要软件
```bash
sudo apt install -y curl wget git nginx mysql-server redis-server ufw
```

### 第二步：安装Node.js和PM2

#### 2.1 安装Node.js 18.x
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

#### 2.2 验证安装
```bash
node --version
npm --version
```

#### 2.3 安装PM2
```bash
sudo npm install -g pm2
```

### 第三步：数据库配置

#### 3.1 配置MySQL
```bash
# 启动MySQL安全配置
sudo mysql_secure_installation

# 登录MySQL
sudo mysql -u root -p

# 创建数据库和用户
CREATE DATABASE answer_pro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'answer_pro_user'@'localhost' IDENTIFIED BY 'YOUR_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON answer_pro.* TO 'answer_pro_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### 3.2 配置Redis
```bash
# 启动Redis
sudo systemctl enable redis-server
sudo systemctl start redis-server

# 测试Redis连接
redis-cli ping
```

### 第四步：部署应用代码

#### 4.1 创建项目目录
```bash
sudo mkdir -p /var/www/answer-quiz-backend
cd /var/www/answer-quiz-backend
```

#### 4.2 克隆项目代码
```bash
# 如果使用Git
sudo git clone YOUR_GIT_REPOSITORY_URL .

# 或者上传代码文件
# scp -r answer-quiz-backend/ root@YOUR_SERVER_IP:/var/www/
```

#### 4.3 安装依赖
```bash
sudo npm install --production
```

#### 4.4 配置环境变量
```bash
# 复制环境变量模板
sudo cp env.production.example .env

# 编辑环境变量
sudo vim .env
```

重要配置项：
```bash
# 数据库配置
DB_HOST=localhost
DB_USER=answer_pro_user
DB_PASSWORD=YOUR_STRONG_PASSWORD
DB_NAME=answer_pro

# JWT密钥（32位随机字符串）
JWT_SECRET=YOUR_32_CHARACTER_JWT_SECRET

# 微信配置
WX_APPID=your_wechat_appid
WX_SECRET=your_wechat_secret

# 域名配置
CORS_ORIGIN=https://yourdomain.com
```

### 第五步：配置Nginx

#### 5.1 创建Nginx配置
```bash
# 复制配置文件
sudo cp nginx.conf /etc/nginx/sites-available/answer-quiz-backend

# 编辑配置文件，替换域名
sudo vim /etc/nginx/sites-available/answer-quiz-backend
```

替换配置中的：
- `YOUR_DOMAIN.com` → 你的实际域名
- SSL证书路径（如果已有证书）

#### 5.2 启用站点
```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/answer-quiz-backend /etc/nginx/sites-enabled/

# 删除默认站点
sudo rm /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
```

### 第六步：SSL证书配置

#### 6.1 使用Let's Encrypt（免费证书）
```bash
# 安装Certbot
sudo apt install -y certbot python3-certbot-nginx

# 申请证书
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 自动续期
sudo crontab -e
# 添加行：0 12 * * * /usr/bin/certbot renew --quiet
```

#### 6.2 使用已有证书
将证书文件放置到：
- 证书文件：`/etc/ssl/certs/yourdomain.pem`
- 私钥文件：`/etc/ssl/private/yourdomain.key`

### 第七步：启动应用

#### 7.1 配置PM2
编辑 `ecosystem.config.js`，修改路径：
```javascript
cwd: '/var/www/answer-quiz-backend',
```

#### 7.2 启动应用
```bash
cd /var/www/answer-quiz-backend

# 启动应用
pm2 start ecosystem.config.js --env production

# 保存PM2配置
pm2 save

# 设置开机自启
pm2 startup
# 复制输出的命令并执行
```

### 第八步：配置防火墙

```bash
# 启用防火墙
sudo ufw enable

# 允许必要端口
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443

# 查看状态
sudo ufw status
```

### 第九步：数据库初始化

```bash
cd /var/www/answer-quiz-backend

# 运行数据库初始化脚本（如果有）
mysql -u answer_pro_user -p answer_pro < database_init.sql
```

## 🔍 部署验证

### 检查服务状态
```bash
# 检查PM2应用状态
pm2 status

# 检查Nginx状态
sudo systemctl status nginx

# 检查MySQL状态
sudo systemctl status mysql

# 检查Redis状态
sudo systemctl status redis-server
```

### 测试API接口
```bash
# 健康检查
curl http://localhost:3000/health

# 通过域名测试
curl https://yourdomain.com/health
```

### 查看日志
```bash
# PM2应用日志
pm2 logs answer-quiz-backend

# Nginx访问日志
sudo tail -f /var/log/nginx/answer-quiz-backend.access.log

# Nginx错误日志
sudo tail -f /var/log/nginx/answer-quiz-backend.error.log
```

## 🔄 更新部署

### 代码更新流程
```bash
cd /var/www/answer-quiz-backend

# 拉取最新代码
sudo git pull origin main

# 安装新依赖（如果有）
sudo npm install --production

# 重启应用
pm2 restart answer-quiz-backend

# 重新加载Nginx（如果配置有变）
sudo nginx -s reload
```

## 🛡️ 安全配置

### 1. 文件权限
```bash
# 设置正确的文件权限
sudo chown -R www-data:www-data /var/www/answer-quiz-backend
sudo chmod -R 755 /var/www/answer-quiz-backend
sudo chmod 600 /var/www/answer-quiz-backend/.env
```

### 2. 数据库安全
- 定期备份数据库
- 使用强密码
- 限制数据库访问IP

### 3. Redis安全
```bash
# 编辑Redis配置
sudo vim /etc/redis/redis.conf

# 设置密码
requirepass YOUR_REDIS_PASSWORD

# 重启Redis
sudo systemctl restart redis-server
```

## 📊 监控和维护

### 系统监控
```bash
# 安装htop
sudo apt install htop

# 查看系统资源
htop
```

### 应用监控
```bash
# PM2监控面板
pm2 monit

# 检查应用性能
pm2 show answer-quiz-backend
```

### 日志管理
```bash
# 配置logrotate
sudo vim /etc/logrotate.d/answer-quiz-backend
```

## 🆘 故障排查

### 常见问题

1. **应用无法启动**
   - 检查环境变量配置
   - 查看PM2日志：`pm2 logs`
   - 检查端口占用：`netstat -tulpn | grep 3000`

2. **数据库连接失败**
   - 检查MySQL服务状态
   - 验证数据库用户权限
   - 检查防火墙设置

3. **Nginx 502错误**
   - 检查Node.js应用是否运行
   - 查看Nginx错误日志
   - 验证代理配置

4. **SSL证书问题**
   - 检查证书文件路径
   - 验证证书有效期
   - 测试证书配置：`nginx -t`

## 📞 技术支持

如果遇到部署问题，请检查：
1. 系统环境是否满足要求
2. 所有配置文件是否正确
3. 服务状态是否正常
4. 日志文件中的错误信息

---

**部署完成后，您的答题小程序后端将在 `https://yourdomain.com` 上运行！** 