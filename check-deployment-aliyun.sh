#!/bin/bash

# 阿里云Linux部署检查脚本
# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  答题小程序后端 - 阿里云Linux部署检查${NC}"
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
    if ss -tulpn | grep -q ":$1 "; then
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

echo -e "\n${YELLOW}🔍 开始检查阿里云Linux部署状态...${NC}\n"

# 1. 检查系统信息
echo -e "${BLUE}1. 检查系统信息${NC}"
echo -e "${GREEN}操作系统: $(cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2 | tr -d '\"')${NC}"
echo -e "${GREEN}内核版本: $(uname -r)${NC}"
echo -e "${GREEN}CPU架构: $(uname -m)${NC}"

# 2. 检查基础软件
echo -e "\n${BLUE}2. 检查基础软件安装${NC}"
check_command "node"
check_command "npm"
check_command "pm2"
check_command "nginx"
check_command "mysql"
check_command "redis-cli"
check_command "firewall-cmd"

# 3. 检查服务状态
echo -e "\n${BLUE}3. 检查服务状态${NC}"
check_service "nginx"
check_service "mysqld"
check_service "redis"
check_service "firewalld"

# 4. 检查端口
echo -e "\n${BLUE}4. 检查端口监听${NC}"
check_port "80"
check_port "443"
check_port "3000"
check_port "3306"
check_port "6379"

# 5. 检查项目文件
echo -e "\n${BLUE}5. 检查项目文件${NC}"
PROJECT_PATH="/var/www/answer-quiz-backend"
check_file "${PROJECT_PATH}/app.js"
check_file "${PROJECT_PATH}/package.json"
check_file "${PROJECT_PATH}/.env"
check_file "${PROJECT_PATH}/ecosystem.config.js"

# 6. 检查Nginx配置
echo -e "\n${BLUE}6. 检查Nginx配置${NC}"
check_file "/etc/nginx/conf.d/answer-quiz-backend.conf"

# 7. 检查PM2应用
echo -e "\n${BLUE}7. 检查PM2应用状态${NC}"
if pm2 list | grep -q "answer-quiz-backend"; then
    PM2_STATUS=$(pm2 jlist 2>/dev/null | python3 -c "import sys, json; data=json.load(sys.stdin); print([app['pm2_env']['status'] for app in data if app['name']=='answer-quiz-backend'][0] if any(app['name']=='answer-quiz-backend' for app in data) else 'not_found')" 2>/dev/null || echo "unknown")
    if [ "$PM2_STATUS" = "online" ]; then
        echo -e "${GREEN}✅ PM2应用运行正常${NC}"
    else
        echo -e "${RED}❌ PM2应用状态异常: $PM2_STATUS${NC}"
    fi
else
    echo -e "${RED}❌ PM2应用未找到${NC}"
fi

# 8. 测试API接口
echo -e "\n${BLUE}8. 测试API接口${NC}"
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null)
if [ "$HEALTH_CHECK" = "200" ]; then
    echo -e "${GREEN}✅ API健康检查通过${NC}"
else
    echo -e "${RED}❌ API健康检查失败 (HTTP $HEALTH_CHECK)${NC}"
fi

# 9. 检查日志文件
echo -e "\n${BLUE}9. 检查日志文件${NC}"
check_file "${PROJECT_PATH}/logs/combined.log"
check_file "/var/log/nginx/access.log"
check_file "/var/log/nginx/error.log"

# 10. 数据库连接测试
echo -e "\n${BLUE}10. 检查数据库连接${NC}"
if mysql -u answer_pro_user -e "SELECT 1;" answer_pro &>/dev/null; then
    echo -e "${GREEN}✅ 数据库连接正常 (无密码认证)${NC}"
else
    echo -e "${YELLOW}⚠️  数据库需要密码认证${NC}"
fi

# 11. Redis连接测试
echo -e "\n${BLUE}11. 检查Redis连接${NC}"
if redis-cli ping 2>/dev/null | grep -q "PONG"; then
    echo -e "${GREEN}✅ Redis连接正常${NC}"
else
    echo -e "${RED}❌ Redis连接失败${NC}"
fi

# 12. 防火墙状态检查
echo -e "\n${BLUE}12. 检查防火墙状态${NC}"
if firewall-cmd --state 2>/dev/null | grep -q "running"; then
    echo -e "${GREEN}✅ 防火墙已启用${NC}"
    # 检查端口开放状态
    if firewall-cmd --list-services | grep -q "http\|https"; then
        echo -e "${GREEN}✅ HTTP/HTTPS服务已开放${NC}"
    else
        echo -e "${YELLOW}⚠️  HTTP/HTTPS服务未开放${NC}"
    fi
    if firewall-cmd --list-ports | grep -q "3000/tcp"; then
        echo -e "${GREEN}✅ 3000端口已开放${NC}"
    else
        echo -e "${YELLOW}⚠️  3000端口未开放${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  防火墙未启用${NC}"
fi

# 13. SSL证书检查
echo -e "\n${BLUE}13. 检查SSL证书${NC}"
if command -v certbot &> /dev/null; then
    CERT_LIST=$(certbot certificates 2>/dev/null)
    if [ ! -z "$CERT_LIST" ]; then
        echo -e "${GREEN}✅ SSL证书已配置${NC}"
        echo -e "${GREEN}证书信息:${NC}"
        echo "$CERT_LIST" | grep -E "(Certificate Name|Domains|Expiry Date)" | sed 's/^/  /'
    else
        echo -e "${YELLOW}⚠️  未找到SSL证书${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Certbot未安装${NC}"
fi

# 14. 磁盘空间检查
echo -e "\n${BLUE}14. 检查磁盘空间${NC}"
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
if [ $DISK_USAGE -lt 80 ]; then
    echo -e "${GREEN}✅ 磁盘空间充足 (已使用: ${DISK_USAGE}%)${NC}"
elif [ $DISK_USAGE -lt 90 ]; then
    echo -e "${YELLOW}⚠️  磁盘空间紧张 (已使用: ${DISK_USAGE}%)${NC}"
else
    echo -e "${RED}❌ 磁盘空间不足 (已使用: ${DISK_USAGE}%)${NC}"
fi

# 15. 内存使用检查
echo -e "\n${BLUE}15. 检查内存使用${NC}"
MEMORY_INFO=$(free | awk 'NR==2{printf "%.0f", $3*100/$2 }')
if [ $MEMORY_INFO -lt 80 ]; then
    echo -e "${GREEN}✅ 内存使用正常 (已使用: ${MEMORY_INFO}%)${NC}"
elif [ $MEMORY_INFO -lt 90 ]; then
    echo -e "${YELLOW}⚠️  内存使用较高 (已使用: ${MEMORY_INFO}%)${NC}"
else
    echo -e "${RED}❌ 内存使用过高 (已使用: ${MEMORY_INFO}%)${NC}"
fi

echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}检查完成！${NC}"
echo -e "${YELLOW}如果发现问题，请查看部署文档或检查相应的日志文件${NC}"
echo -e "${BLUE}========================================${NC}"

# 显示有用的命令（阿里云Linux版本）
echo -e "\n${YELLOW}💡 阿里云Linux常用命令：${NC}"
echo -e "查看PM2状态: ${GREEN}pm2 status${NC}"
echo -e "查看PM2日志: ${GREEN}pm2 logs answer-quiz-backend${NC}"
echo -e "查看Nginx状态: ${GREEN}systemctl status nginx${NC}"
echo -e "查看防火墙状态: ${GREEN}firewall-cmd --list-all${NC}"
echo -e "重启应用: ${GREEN}pm2 restart answer-quiz-backend${NC}"
echo -e "重启Nginx: ${GREEN}systemctl restart nginx${NC}"
echo -e "查看系统日志: ${GREEN}journalctl -f${NC}"
echo -e "查看端口占用: ${GREEN}ss -tulpn${NC}" 