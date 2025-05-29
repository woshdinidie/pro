# 🚀 答题小程序后端 - 阿里云Linux部署指南

## 🏛️ 适用系统
- **Alibaba Cloud Linux 3.2104 LTS 64位**
- **基于RHEL/CentOS的系统架构**
- **使用 yum/dnf 包管理器**
- **使用 firewalld 防火墙**

## 📋 系统差异说明

### 与Ubuntu的主要差异
| 项目 | Ubuntu | 阿里云Linux |
|------|--------|-------------|
| 包管理器 | apt | yum/dnf |
| 防火墙 | ufw | firewalld |
| MySQL服务名 | mysql | mysqld |
| Nginx用户 | www-data | nginx |
| 包源 | Ubuntu源 | EPEL源 |

## 🛠️ 一键部署（推荐）

### 1. 连接服务器
```bash
ssh root@YOUR_SERVER_IP
```

### 2. 下载部署脚本
```bash
# 方法1：如果有Git仓库
git clone YOUR_REPOSITORY_URL
cd answer-quiz-backend
chmod +x deploy-aliyun.sh

# 方法2：直接创建脚本
vim deploy-aliyun.sh
# 复制脚本内容并保存
chmod +x deploy-aliyun.sh
```

### 3. 运行一键部署
```bash
./deploy-aliyun.sh
```

### 4. 按提示输入信息
- 域名（例如：example.com）
- 数据库密码（建议包含大小写字母、数字和特殊字符）
- Redis密码（可选，直接回车跳过）
- Git仓库地址

## 🔧 手动部署步骤

### 第一步：系统环境准备

#### 1.1 系统更新
```bash
yum update -y
```

#### 1.2 安装EPEL源
```bash
yum install -y epel-release
```

#### 1.3 安装基础软件
```bash
yum install -y curl wget git nginx mysql-server redis firewalld vim
```

### 第二步：安装Node.js和PM2

#### 2.1 添加NodeSource源
```bash
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
```

#### 2.2 安装Node.js
```bash
yum install -y nodejs
```

#### 2.3 验证安装
```bash
node --version
npm --version
```

#### 2.4 安装PM2
```bash
npm install -g pm2
```

### 第三步：配置MySQL

#### 3.1 启动MySQL服务
```bash
systemctl enable mysqld
systemctl start mysqld
```

#### 3.2 获取临时密码（新安装的MySQL）
```bash
grep 'temporary password' /var/log/mysqld.log
```

#### 3.3 安全配置
```bash
mysql_secure_installation
```

#### 3.4 创建数据库和用户
```bash
mysql -u root -p
```
```sql
CREATE DATABASE answer_pro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'answer_pro_user'@'localhost' IDENTIFIED BY 'YOUR_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON answer_pro.* TO 'answer_pro_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 第四步：配置Redis

#### 4.1 启动Redis服务
```bash
systemctl enable redis
systemctl start redis
```

#### 4.2 测试连接
```bash
redis-cli ping
```

#### 4.3 配置密码（可选）
```bash
vim /etc/redis.conf
# 添加行：requirepass YOUR_REDIS_PASSWORD
systemctl restart redis
```

### 第五步：配置防火墙

#### 5.1 启动firewalld
```bash
systemctl enable firewalld
systemctl start firewalld
```

#### 5.2 开放必要端口
```bash
firewall-cmd --permanent --add-service=ssh
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --reload
```

#### 5.3 查看防火墙状态
```bash
firewall-cmd --list-all
```

### 第六步：部署应用代码

#### 6.1 创建项目目录
```bash
mkdir -p /var/www/answer-quiz-backend
cd /var/www/answer-quiz-backend
```

#### 6.2 克隆项目
```bash
git clone YOUR_GIT_REPOSITORY_URL .
```

#### 6.3 安装依赖
```bash
npm install --production
```

#### 6.4 配置环境变量
```bash
cp env.production.example .env
vim .env
```

### 第七步：配置Nginx

#### 7.1 复制配置文件
```bash
cp nginx.conf /etc/nginx/conf.d/answer-quiz-backend.conf
```

#### 7.2 修改域名
```bash
sed -i 's/YOUR_DOMAIN.com/yourdomain.com/g' /etc/nginx/conf.d/answer-quiz-backend.conf
```

#### 7.3 测试和启动
```bash
nginx -t
systemctl enable nginx
systemctl start nginx
```

### 第八步：启动应用

#### 8.1 配置PM2
```bash
# 修改ecosystem.config.js中的路径
sed -i 's|/path/to/your/answer-quiz-backend|/var/www/answer-quiz-backend|g' ecosystem.config.js
```

#### 8.2 启动应用
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

#### 8.3 设置文件权限
```bash
chown -R nginx:nginx /var/www/answer-quiz-backend
chmod -R 755 /var/www/answer-quiz-backend
chmod 600 /var/www/answer-quiz-backend/.env
```

### 第九步：配置SSL证书

#### 9.1 安装Certbot
```bash
yum install -y certbot python3-certbot-nginx
```

#### 9.2 申请证书
```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

#### 9.3 设置自动续期
```bash
crontab -e
# 添加：0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔍 部署验证

### 1. 运行检查脚本
```bash
./check-deployment-aliyun.sh
```

### 2. 手动检查服务状态
```bash
# 检查所有服务
systemctl status nginx mysqld redis firewalld

# 检查PM2应用
pm2 status

# 检查端口监听
ss -tulpn | grep -E "(80|443|3000|3306|6379)"
```

### 3. 测试API
```bash
# 本地测试
curl http://localhost:3000/health

# 域名测试
curl https://yourdomain.com/health
```

## 🔄 维护操作

### 服务管理
```bash
# 重启服务
systemctl restart nginx
systemctl restart mysqld
systemctl restart redis

# 重启应用
pm2 restart answer-quiz-backend

# 查看日志
pm2 logs answer-quiz-backend
journalctl -f -u nginx
```

### 代码更新
```bash
cd /var/www/answer-quiz-backend
git pull origin main
npm install --production
pm2 restart answer-quiz-backend
```

### 防火墙管理
```bash
# 查看防火墙状态
firewall-cmd --list-all

# 开放新端口
firewall-cmd --permanent --add-port=PORT/tcp
firewall-cmd --reload

# 关闭端口
firewall-cmd --permanent --remove-port=PORT/tcp
firewall-cmd --reload
```

## 🛡️ 安全建议

### 1. 系统安全
```bash
# 定期更新系统
yum update -y

# 检查安全更新
yum check-update --security

# 配置自动安全更新
yum install -y yum-cron
systemctl enable yum-cron
```

### 2. 数据库安全
- 使用强密码
- 定期备份数据库
- 限制远程访问

### 3. 应用安全
- 定期更新依赖包
- 监控应用日志
- 配置应用级别的访问控制

## 🆘 故障排查

### 常见问题

#### 1. yum命令失败
```bash
# 清理yum缓存
yum clean all

# 重建缓存
yum makecache
```

#### 2. firewalld服务问题
```bash
# 重启firewalld
systemctl restart firewalld

# 如果启动失败，检查配置
firewall-cmd --check-config
```

#### 3. MySQL连接问题
```bash
# 检查MySQL日志
tail -f /var/log/mysqld.log

# 重置MySQL密码
systemctl stop mysqld
mysqld_safe --skip-grant-tables &
mysql -u root
```

#### 4. 权限问题
```bash
# 重新设置SELinux上下文
restorecon -R /var/www/answer-quiz-backend

# 检查SELinux状态
getenforce

# 临时关闭SELinux（仅用于测试）
setenforce 0
```

## 📊 性能优化

### 阿里云Linux优化建议
```bash
# 调整系统参数
echo 'net.core.somaxconn = 1024' >> /etc/sysctl.conf
echo 'net.ipv4.tcp_max_syn_backlog = 1024' >> /etc/sysctl.conf
sysctl -p

# 优化文件描述符限制
echo '* soft nofile 65535' >> /etc/security/limits.conf
echo '* hard nofile 65535' >> /etc/security/limits.conf
```

## 📞 技术支持

遇到问题时的检查清单：
1. 运行 `check-deployment-aliyun.sh` 脚本
2. 检查系统日志：`journalctl -f`
3. 检查应用日志：`pm2 logs`
4. 检查防火墙配置：`firewall-cmd --list-all`
5. 检查SELinux状态：`getenforce`

---

**阿里云Linux 3.2104 LTS部署完成后，您的应用将稳定运行在企业级的云原生环境中！** 