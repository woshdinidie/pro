#!/bin/bash

# 一键部署脚本 - 简化版
set -e

echo "🚀 答题小程序后端 - 一键部署"
echo "================================"

# 获取用户输入
read -p "请输入您的域名 (例如: example.com): " DOMAIN
read -p "请输入数据库密码: " DB_PASSWORD
read -p "请输入Redis密码 (可留空): " REDIS_PASSWORD
read -p "请输入您的Git仓库地址: " GIT_REPO

echo "开始部署..."

# 1. 更新系统
echo "📦 更新系统..."
apt update && apt upgrade -y

# 2. 安装基础软件
echo "🔧 安装基础软件..."
apt install -y curl wget git nginx mysql-server redis-server ufw

# 3. 安装Node.js 18
echo "📦 安装Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# 4. 安装PM2
echo "📦 安装PM2..."
npm install -g pm2

# 5. 克隆项目
echo "📥 下载项目代码..."
mkdir -p /var/www
cd /var/www
git clone $GIT_REPO answer-quiz-backend
cd answer-quiz-backend

# 6. 安装依赖
echo "📦 安装项目依赖..."
npm install --production

# 7. 配置环境变量
echo "⚙️ 配置环境变量..."
cp env.production.example .env
sed -i "s/YOUR_STRONG_PASSWORD_HERE/$DB_PASSWORD/g" .env
sed -i "s/YOUR_REDIS_PASSWORD_HERE/$REDIS_PASSWORD/g" .env
sed -i "s/yourdomain.com/$DOMAIN/g" .env

# 8. 配置数据库
echo "🗄️ 配置数据库..."
mysql -e "CREATE DATABASE IF NOT EXISTS answer_pro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS 'answer_pro_user'@'localhost' IDENTIFIED BY '$DB_PASSWORD';"
mysql -e "GRANT ALL PRIVILEGES ON answer_pro.* TO 'answer_pro_user'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

# 9. 配置Nginx
echo "🌐 配置Nginx..."
cp nginx.conf /etc/nginx/sites-available/answer-quiz-backend
sed -i "s/YOUR_DOMAIN.com/$DOMAIN/g" /etc/nginx/sites-available/answer-quiz-backend
ln -sf /etc/nginx/sites-available/answer-quiz-backend /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 10. 配置PM2
echo "🚀 配置PM2..."
sed -i "s|/path/to/your/answer-quiz-backend|/var/www/answer-quiz-backend|g" ecosystem.config.js

# 11. 配置防火墙
echo "🔒 配置防火墙..."
ufw --force enable
ufw allow ssh
ufw allow 80
ufw allow 443

# 12. 启动服务
echo "🚀 启动服务..."
systemctl enable nginx redis-server mysql
systemctl start nginx redis-server mysql

# 13. 启动应用
echo "🚀 启动应用..."
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# 14. 配置SSL（使用Let's Encrypt）
echo "🔐 配置SSL证书..."
apt install -y certbot python3-certbot-nginx
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN || echo "SSL配置失败，请手动配置"

echo "✅ 部署完成！"
echo "================================"
echo "🌐 您的网站: https://$DOMAIN"
echo "📊 健康检查: https://$DOMAIN/health"
echo "📝 查看日志: pm2 logs answer-quiz-backend"
echo "📋 检查状态: pm2 status"
echo "================================"
echo "⚠️  请记住配置您的微信小程序配置信息！" 