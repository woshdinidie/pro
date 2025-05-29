#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}    答题小程序后端 - 部署检查脚本${NC}"
echo -e "${BLUE}========================================${NC}"

# 检查函数
check_service() {
    if systemctl is-active --quiet $1; then
        echo -e "${GREEN}✅ $1 服务运行正常${NC}"
        return 0
    else
        echo -e "${RED}❌ $1 服务未运行${NC}"
        return 1
    fi
}

check_port() {
    if netstat -tulpn | grep -q ":$1 "; then
        echo -e "${GREEN}✅ 端口 $1 正在监听${NC}"
        return 0
    else
        echo -e "${RED}❌ 端口 $1 未监听${NC}"
        return 1
    fi
}

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅ 文件存在: $1${NC}"
        return 0
    else
        echo -e "${RED}❌ 文件不存在: $1${NC}"
        return 1
    fi
}

check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✅ $1 已安装${NC}"
        return 0
    else
        echo -e "${RED}❌ $1 未安装${NC}"
        return 1
    fi
}

echo -e "\n${YELLOW}🔍 开始检查部署状态...${NC}\n"

# 1. 检查基础软件
echo -e "${BLUE}1. 检查基础软件安装${NC}"
check_command "node"
check_command "npm"
check_command "pm2"
check_command "nginx"
check_command "mysql"
check_command "redis-cli"

# 2. 检查服务状态
echo -e "\n${BLUE}2. 检查服务状态${NC}"
check_service "nginx"
check_service "mysql"
check_service "redis-server"

# 3. 检查端口
echo -e "\n${BLUE}3. 检查端口监听${NC}"
check_port "80"
check_port "443"
check_port "3000"
check_port "3306"
check_port "6379"

# 4. 检查项目文件
echo -e "\n${BLUE}4. 检查项目文件${NC}"
PROJECT_PATH="/var/www/answer-quiz-backend"
check_file "${PROJECT_PATH}/app.js"
check_file "${PROJECT_PATH}/package.json"
check_file "${PROJECT_PATH}/.env"
check_file "${PROJECT_PATH}/ecosystem.config.js"

# 5. 检查Nginx配置
echo -e "\n${BLUE}5. 检查Nginx配置${NC}"
check_file "/etc/nginx/sites-available/answer-quiz-backend"
check_file "/etc/nginx/sites-enabled/answer-quiz-backend"

# 6. 检查PM2应用
echo -e "\n${BLUE}6. 检查PM2应用状态${NC}"
PM2_STATUS=$(pm2 jlist 2>/dev/null | jq -r '.[] | select(.name=="answer-quiz-backend") | .pm2_env.status' 2>/dev/null)
if [ "$PM2_STATUS" = "online" ]; then
    echo -e "${GREEN}✅ PM2应用运行正常${NC}"
else
    echo -e "${RED}❌ PM2应用未运行或状态异常${NC}"
fi

# 7. 测试API接口
echo -e "\n${BLUE}7. 测试API接口${NC}"
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null)
if [ "$HEALTH_CHECK" = "200" ]; then
    echo -e "${GREEN}✅ API健康检查通过${NC}"
else
    echo -e "${RED}❌ API健康检查失败 (HTTP $HEALTH_CHECK)${NC}"
fi

# 8. 检查日志文件
echo -e "\n${BLUE}8. 检查日志文件${NC}"
check_file "${PROJECT_PATH}/logs/combined.log"
check_file "/var/log/nginx/answer-quiz-backend.access.log"
check_file "/var/log/nginx/answer-quiz-backend.error.log"

# 9. 数据库连接测试
echo -e "\n${BLUE}9. 检查数据库连接${NC}"
if mysql -u answer_pro_user -p'YOUR_PASSWORD' -e "SELECT 1;" answer_pro &>/dev/null; then
    echo -e "${GREEN}✅ 数据库连接正常${NC}"
else
    echo -e "${RED}❌ 数据库连接失败${NC}"
fi

# 10. Redis连接测试
echo -e "\n${BLUE}10. 检查Redis连接${NC}"
if redis-cli ping &>/dev/null | grep -q "PONG"; then
    echo -e "${GREEN}✅ Redis连接正常${NC}"
else
    echo -e "${RED}❌ Redis连接失败${NC}"
fi

# 11. SSL证书检查（如果配置了HTTPS）
echo -e "\n${BLUE}11. 检查SSL证书${NC}"
if [ -f "/etc/ssl/certs/YOUR_DOMAIN.pem" ]; then
    CERT_EXPIRY=$(openssl x509 -enddate -noout -in /etc/ssl/certs/YOUR_DOMAIN.pem 2>/dev/null | cut -d= -f2)
    if [ ! -z "$CERT_EXPIRY" ]; then
        echo -e "${GREEN}✅ SSL证书存在，到期时间: $CERT_EXPIRY${NC}"
    else
        echo -e "${RED}❌ SSL证书格式错误${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  未找到SSL证书文件${NC}"
fi

# 12. 防火墙状态
echo -e "\n${BLUE}12. 检查防火墙状态${NC}"
if ufw status | grep -q "Status: active"; then
    echo -e "${GREEN}✅ 防火墙已启用${NC}"
    ufw status | grep -E "(80|443|22)" && echo -e "${GREEN}✅ 必要端口已开放${NC}"
else
    echo -e "${YELLOW}⚠️  防火墙未启用${NC}"
fi

echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}检查完成！${NC}"
echo -e "${YELLOW}如果发现问题，请查看部署文档或检查相应的日志文件${NC}"
echo -e "${BLUE}========================================${NC}"

# 显示有用的命令
echo -e "\n${YELLOW}💡 常用命令：${NC}"
echo -e "查看PM2状态: ${GREEN}pm2 status${NC}"
echo -e "查看PM2日志: ${GREEN}pm2 logs answer-quiz-backend${NC}"
echo -e "查看Nginx状态: ${GREEN}sudo systemctl status nginx${NC}"
echo -e "重启应用: ${GREEN}pm2 restart answer-quiz-backend${NC}"
echo -e "重启Nginx: ${GREEN}sudo systemctl restart nginx${NC}" 