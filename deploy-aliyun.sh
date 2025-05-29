#!/bin/bash

# 阿里云Linux专用部署脚本
set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  答题小程序后端 - 阿里云Linux部署脚本${NC}"
echo -e "${BLUE}========================================${NC}"

# 配置变量
PROJECT_NAME="answer-quiz-backend"
DEPLOY_PATH="/var/www/${PROJECT_NAME}"
BACKUP_PATH="/var/backups/${PROJECT_NAME}"
NODE_VERSION="18"

# 函数：打印状态信息
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 函数：检查命令执行结果
check_result() {
    if [ $? -eq 0 ]; then
        print_status "$1 成功"
    else
        print_error "$1 失败"
        exit 1
    fi
}

# 检查root权限
if [ "$EUID" -ne 0 ]; then
    print_error "请使用 root 权限运行此脚本"
    exit 1
fi

# 获取用户输入
read -p "请输入您的域名 (例如: example.com): " DOMAIN
read -p "请输入数据库密码: " DB_PASSWORD
read -s -p "请输入Redis密码 (可留空): " REDIS_PASSWORD
echo
read -p "请输入您的Git仓库地址: " GIT_REPO

print_status "开始部署流程..."

# 1. 系统更新 (使用yum)
print_status "更新系统包..."
yum update -y
check_result "系统更新"

# 2. 安装EPEL源
print_status "安装EPEL源..."
yum install -y epel-release
check_result "EPEL源安装"

# 3. 安装必要的软件 (适配阿里云Linux)
print_status "安装必要软件..."
yum install -y curl wget git nginx mysql-server redis firewalld vim
check_result "软件安装"

# 4. 安装Node.js (使用NodeSource源)
print_status "安装 Node.js ${NODE_VERSION}..."
curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | bash -
yum install -y nodejs
check_result "Node.js 安装"

# 5. 安装PM2
print_status "安装 PM2..."
npm install -g pm2
check_result "PM2 安装"

# 6. 创建项目目录
print_status "创建项目目录..."
mkdir -p ${DEPLOY_PATH}
mkdir -p ${BACKUP_PATH}
mkdir -p /var/log/answer-quiz-backend
check_result "目录创建"

# 7. 克隆项目
print_status "下载项目代码..."
cd /var/www
if [ -d "answer-quiz-backend" ]; then
    rm -rf answer-quiz-backend
fi
git clone $GIT_REPO answer-quiz-backend
cd answer-quiz-backend
check_result "代码下载"

# 8. 安装项目依赖
print_status "安装项目依赖..."
npm install --production
check_result "依赖安装"

# 9. 配置环境变量
print_status "配置环境变量..."
cp env.production.example .env
sed -i "s/YOUR_STRONG_PASSWORD_HERE/$DB_PASSWORD/g" .env
sed -i "s/YOUR_REDIS_PASSWORD_HERE/$REDIS_PASSWORD/g" .env
sed -i "s/yourdomain.com/$DOMAIN/g" .env
# 生成随机JWT密钥
JWT_SECRET=$(openssl rand -base64 32)
sed -i "s/YOUR_STRONG_JWT_SECRET_KEY_32_CHARACTERS/$JWT_SECRET/g" .env
check_result "环境变量配置"

# 10. 启动并配置MySQL
print_status "配置 MySQL..."
systemctl enable mysqld
systemctl start mysqld

# 获取MySQL临时密码
TEMP_PASSWORD=$(grep 'temporary password' /var/log/mysqld.log 2>/dev/null | tail -1 | awk '{print $NF}' || echo "")

if [ ! -z "$TEMP_PASSWORD" ]; then
    print_status "检测到MySQL临时密码，正在配置..."
    # 重置root密码并创建数据库
    mysql --connect-expired-password -uroot -p"$TEMP_PASSWORD" <<EOF
ALTER USER 'root'@'localhost' IDENTIFIED BY '${DB_PASSWORD}Root123!';
CREATE DATABASE IF NOT EXISTS answer_pro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'answer_pro_user'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON answer_pro.* TO 'answer_pro_user'@'localhost';
FLUSH PRIVILEGES;
EOF
else
    # 如果没有临时密码，直接配置
    mysql -e "CREATE DATABASE IF NOT EXISTS answer_pro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    mysql -e "CREATE USER IF NOT EXISTS 'answer_pro_user'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';"
    mysql -e "GRANT ALL PRIVILEGES ON answer_pro.* TO 'answer_pro_user'@'localhost';"
    mysql -e "FLUSH PRIVILEGES;"
fi
check_result "MySQL 配置"

# 11. 配置Redis
print_status "配置 Redis..."
systemctl enable redis
systemctl start redis

# 如果设置了Redis密码
if [ ! -z "$REDIS_PASSWORD" ]; then
    echo "requirepass $REDIS_PASSWORD" >> /etc/redis.conf
    systemctl restart redis
fi
check_result "Redis 配置"

# 12. 配置防火墙 (使用firewalld)
print_status "配置防火墙..."
systemctl enable firewalld
systemctl start firewalld
firewall-cmd --permanent --add-service=ssh
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --reload
check_result "防火墙配置"

# 13. 配置Nginx
print_status "配置 Nginx..."
cp nginx.conf /etc/nginx/conf.d/answer-quiz-backend.conf
sed -i "s/YOUR_DOMAIN.com/$DOMAIN/g" /etc/nginx/conf.d/answer-quiz-backend.conf

# 备份并删除默认配置
cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup
# 注释掉默认server块（如果存在）
sed -i '/server {/,/^}/s/^/#/' /etc/nginx/nginx.conf

systemctl enable nginx
systemctl start nginx
nginx -t
check_result "Nginx 配置"

# 14. 配置PM2
print_status "配置PM2..."
sed -i "s|/path/to/your/answer-quiz-backend|/var/www/answer-quiz-backend|g" ecosystem.config.js
check_result "PM2 配置"

# 15. 设置文件权限
print_status "设置文件权限..."
chown -R nginx:nginx ${DEPLOY_PATH}
chmod -R 755 ${DEPLOY_PATH}
chmod 600 ${DEPLOY_PATH}/.env
check_result "权限设置"

# 16. 启动应用
print_status "启动 Node.js 应用..."
cd ${DEPLOY_PATH}
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
check_result "应用启动"

# 17. 配置SSL证书 (使用Let's Encrypt)
print_status "配置SSL证书..."
yum install -y python3-certbot-nginx || yum install -y certbot python3-certbot-nginx
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN || print_warning "SSL配置失败，请手动配置"

# 18. 初始化数据库
print_status "初始化数据库..."
if [ -f "database_init.sql" ]; then
    mysql -u answer_pro_user -p"$DB_PASSWORD" answer_pro < database_init.sql
    check_result "数据库初始化"
else
    print_warning "未找到database_init.sql文件，请手动初始化数据库"
fi

print_status "部署完成！"
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}部署信息：${NC}"
echo -e "${GREEN}操作系统：Alibaba Cloud Linux 3.2104 LTS${NC}"
echo -e "${GREEN}项目路径：${DEPLOY_PATH}${NC}"
echo -e "${GREEN}应用端口：3000${NC}"
echo -e "${GREEN}域名：https://${DOMAIN}${NC}"
echo -e "${GREEN}Nginx配置：/etc/nginx/conf.d/answer-quiz-backend.conf${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${YELLOW}重要提醒：${NC}"
echo -e "${YELLOW}1. JWT密钥已自动生成${NC}"
echo -e "${YELLOW}2. 请编辑 ${DEPLOY_PATH}/.env 配置微信小程序信息${NC}"
echo -e "${YELLOW}3. 数据库用户：answer_pro_user${NC}"
echo -e "${YELLOW}4. 检查服务状态：pm2 status${NC}"
echo -e "${GREEN}========================================${NC}"

# 显示下一步操作
echo -e "\n${BLUE}下一步操作：${NC}"
echo -e "1. 配置微信小程序信息："
echo -e "   ${GREEN}vim ${DEPLOY_PATH}/.env${NC}"
echo -e "2. 检查服务状态："
echo -e "   ${GREEN}pm2 status${NC}"
echo -e "   ${GREEN}systemctl status nginx${NC}"
echo -e "3. 测试API："
echo -e "   ${GREEN}curl https://${DOMAIN}/health${NC}"
echo -e "4. 查看日志："
echo -e "   ${GREEN}pm2 logs answer-quiz-backend${NC}" 