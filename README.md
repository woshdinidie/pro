# 有奖答题小程序 - 后端API服务

这是有奖答题小程序的后端API服务，提供用户认证、题目管理、PK对战、社区互动等功能的接口。

## 技术栈

- Node.js
- Express
- MySQL (Sequelize ORM)
- Redis
- JWT认证

## 环境要求

- Node.js >= 14.x
- MySQL >= 8.0
- Redis >= 5.0

## 安装说明

### 1. 克隆项目

```bash
git clone <repository-url>
cd answer-quiz-backend
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制环境变量示例文件，并根据实际情况修改：

```bash
cp .env.example .env
```

编辑.env文件，配置数据库连接等信息：

```bash
# 服务器配置
PORT=3000
NODE_ENV=development

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=answer_pro

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# 微信小程序配置
WX_APPID=your_wechat_appid
WX_SECRET=your_wechat_secret
```

### 4. 创建数据库

在MySQL中创建数据库：

```sql
CREATE DATABASE answer_pro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

初始化数据库表结构：

```bash
# 此功能将在后续开发中实现
# npm run db:migrate
```

### 5. 启动服务

开发模式：

```bash
npm run dev
```

生产模式：

```bash
npm start
```

## 项目结构

```
answer-quiz-backend/
├── config/             # 配置文件
│   ├── database.js     # 数据库配置
│   ├── redis.js        # Redis配置
│   └── jwt.js          # JWT认证配置
├── controllers/        # 控制器(业务逻辑)
│   ├── userController.js
│   ├── questionController.js
│   └── ...
├── middlewares/        # 中间件
│   ├── auth.js         # 认证中间件
│   └── errorHandler.js # 错误处理中间件
├── models/             # 数据模型
│   ├── user.js
│   ├── question.js
│   └── ...
├── routes/             # 路由
│   ├── userRoutes.js
│   ├── questionRoutes.js
│   └── ...
├── utils/              # 工具函数
│   ├── logger.js
│   └── response.js
├── app.js              # 应用程序入口
├── package.json        # 项目依赖
└── .env                # 环境变量
```

## API文档

API文档详见 `api接口设计.md` 文件。

## 开发团队

- [团队成员]

## 许可证

[许可证信息] 