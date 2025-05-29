#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}    答题小程序后端 - 自动化部署脚本${NC}"
echo -e "${BLUE}========================================${NC}"

# 配置变量
PROJECT_NAME="answer-quiz-backend"
DEPLOY_PATH="/var/www/${PROJECT_NAME}"
GIT_REPO="https://github.com/yourusername/answer-quiz-backend.git"
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

print_status "开始部署流程..."

# 1. 系统更新
print_status "更新系统包..."
apt update && apt upgrade -y
check_result "系统更新"

# 2. 安装必要的软件
print_status "安装必要软件..."
apt install -y curl wget gnupg2 software-properties-common git nginx mysql-server redis-server ufw
check_result "软件安装"

# 3. 安装Node.js
print_status "安装 Node.js ${NODE_VERSION}..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt install -y nodejs
check_result "Node.js 安装"

# 4. 安装PM2
print_status "安装 PM2..."
npm install -g pm2
check_result "PM2 安装"

# 5. 创建项目目录
print_status "创建项目目录..."
mkdir -p ${DEPLOY_PATH}
mkdir -p ${BACKUP_PATH}
mkdir -p /var/log/answer-quiz-backend
check_result "目录创建"

# 6. 克隆项目（如果不存在）
if [ ! -d "${DEPLOY_PATH}/.git" ]; then
    print_status "克隆项目代码..."
    git clone ${GIT_REPO} ${DEPLOY_PATH}
    check_result "代码克隆"
else
    print_status "更新项目代码..."
    cd ${DEPLOY_PATH}
    git pull origin main
    check_result "代码更新"
fi

# 7. 安装项目依赖
print_status "安装项目依赖..."
cd ${DEPLOY_PATH}
npm install --production
check_result "依赖安装"

# 8. 配置MySQL
print_status "配置 MySQL..."
mysql -e "CREATE DATABASE IF NOT EXISTS answer_pro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS 'answer_pro_user'@'localhost' IDENTIFIED BY 'YOUR_DB_PASSWORD';"
mysql -e "GRANT ALL PRIVILEGES ON answer_pro.* TO 'answer_pro_user'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"
check_result "MySQL 配置"

# 9. 配置Redis
print_status "配置 Redis..."
systemctl enable redis-server
systemctl start redis-server
check_result "Redis 配置"

# 10. 配置防火墙
print_status "配置防火墙..."
ufw --force enable
ufw allow ssh
ufw allow 80
ufw allow 443
ufw allow 3000
check_result "防火墙配置"

# 11. 配置Nginx
print_status "配置 Nginx..."
cp ${DEPLOY_PATH}/nginx.conf /etc/nginx/sites-available/${PROJECT_NAME}
ln -sf /etc/nginx/sites-available/${PROJECT_NAME} /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
check_result "Nginx 配置"

# 12. 设置文件权限
print_status "设置文件权限..."
chown -R www-data:www-data ${DEPLOY_PATH}
chmod -R 755 ${DEPLOY_PATH}
check_result "权限设置"

# 13. 启动服务
print_status "启动服务..."
systemctl enable nginx
systemctl restart nginx
check_result "Nginx 启动"

# 14. 使用PM2启动应用
print_status "启动 Node.js 应用..."
cd ${DEPLOY_PATH}
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
check_result "应用启动"

print_status "部署完成！"
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}部署信息：${NC}"
echo -e "${GREEN}项目路径：${DEPLOY_PATH}${NC}"
echo -e "${GREEN}应用端口：3000${NC}"
echo -e "${GREEN}Nginx配置：/etc/nginx/sites-available/${PROJECT_NAME}${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${YELLOW}请完成以下步骤：${NC}"
echo -e "${YELLOW}1. 编辑 ${DEPLOY_PATH}/.env 文件配置环境变量${NC}"
echo -e "${YELLOW}2. 配置SSL证书${NC}"
echo -e "${YELLOW}3. 更新Nginx配置中的域名${NC}"
echo -e "${YELLOW}4. 重启服务：systemctl restart nginx${NC}"
echo -e "${GREEN}========================================${NC}" 