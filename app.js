// 加载环境变量
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');
const errorHandler = require('./middlewares/errorHandler');
const { initModels } = require('./models/index');
const config = require('./config/config');
const StatsEventTrigger = require('./utils/statsEventTrigger');
const rateLimit = require('express-rate-limit');
const { refreshAndCacheLeaderboardData } = require('./controllers/userController'); // 导入刷新函数

// 引入 StatsCache 和 RedisClient 实例
const statsCache = require('./utils/statsCache');
const redisClient = require('./utils/redis');

// 导入路由
const routes = require('./routes/index');

// 创建Express应用
const app = express();
const PORT = config.port || 3000;

// 基本中间件
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev', { stream: { write: msg => logger.http(msg.trim()) } }));

// 静态文件服务 (如果需要)
// app.use('/public', express.static(path.join(__dirname, 'public')));

// API 限流 (通用配置)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: (req, res) => (req.user && req.user.isAdmin) ? 0 : 1000, // 管理员无限制，普通用户1000次 (假设req.user通过身份验证中间件设置)
  standardHeaders: true, 
  legacyHeaders: false, 
  message: { code: 429, message: '请求过于频繁，请稍后再试' },
  keyGenerator: (req) => req.ip // 基于IP进行限流
});
app.use('/api/', apiLimiter);

// 对特定敏感接口进行更严格的限流，例如登录
const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小时
  max: 20, // 每个IP每小时最多20次登录相关尝试
  message: { code: 429, message: '操作过于频繁，请稍后再试' },
  keyGenerator: (req) => req.ip
});
// 应用到登录和注册等需要验证的接口
app.use('/api/v1/user/login', loginLimiter);
app.use('/api/v1/user/register', loginLimiter);
app.use('/api/v1/user/send-code', loginLimiter); // 如果有发送验证码的接口

// 根路由-健康检查
app.get('/', (req, res) => {
  res.json({ 
    message: '有奖答题小程序API服务器运行中',
    version: '1.0.0',
    time: new Date().toISOString()
  });
});

// 应用API路由
app.use('/api/v1', routes);

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

// 全局错误处理中间件 (应放在所有路由和中间件之后)
app.use(errorHandler);

// 🚀 添加：服务器实例变量和关闭状态标志
let server;
let isShuttingDown = false;
let connections = new Set(); // 跟踪所有连接

// 连接数据库并启动服务器
initModels()
  .then(async () => { // 标记为 async
    logger.info('数据库连接成功');

    // 首次启动时，立即刷新并缓存排行榜数据
    try {
      await refreshAndCacheLeaderboardData();
    } catch (e) {
      logger.error('Initial leaderboard cache population failed:', e);
    }

    // 设置定时刷新排行榜缓存的任务
    // 📊 排行榜刷新时间配置说明：
    // - 开发环境：建议10-60秒，方便测试
    // - 生产环境：建议10-30分钟，平衡性能和实时性
    // 
    // ⏰ 常用时间配置：
    // 10秒: 10000
    // 30秒: 30000  
    // 1分钟: 60000
    // 5分钟: 5 * 60 * 1000
    // 10分钟: 10 * 60 * 1000
    // 30分钟: 30 * 60 * 1000
    // 1小时: 60 * 60 * 1000
    const refreshIntervalMs = (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') 
                              ? 60 * 60 * 1000 // 开发环境1小时
                              : 60 * 60 * 1000; // 生产环境1小时

    setInterval(async () => {
      try {
        await refreshAndCacheLeaderboardData();
      } catch (e) {
        logger.error('Scheduled leaderboard cache population failed:', e);
      }
    }, refreshIntervalMs);
    logger.info(`Leaderboard cache refresh scheduled every ${refreshIntervalMs / 1000} seconds.`);

    server = app.listen(PORT, () => {
      logger.info(`服务器正在运行在 http://localhost:${PORT}`);
      logger.info(`当前环境: ${config.env}`);
      logger.info(`日志级别: ${logger.level}`);
      // 初始化事件触发器 - StatsEventTrigger 内部已直接引用 statsCache，无需显式初始化
      // StatsEventTrigger.initialize(statsCache); 
    });

    // 确保 server 变量已定义后再附加事件监听器
    if (server) {
      // 跟踪所有连接，以便优雅关闭时强制关闭
      server.on('connection', (socket) => {
        connections.add(socket);
        socket.on('close', () => {
          connections.delete(socket);
        });
      });

      // 服务器错误处理
      server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          logger.error(`端口 ${PORT} 已被占用，请检查是否有其他服务在运行`);
          process.exit(1);
        } else {
          logger.error('服务器错误:', error);
        }
      });
    } else {
      // 如果server未能成功初始化 (例如 app.listen 失败)，记录错误并退出
      logger.error('HTTP服务器未能成功启动，无法附加事件监听器。');
      process.exit(1);
    }

  })
  .catch(err => {
    logger.error('无法连接到数据库或服务器启动失败:', err);
    process.exit(1); // 数据库连接失败或服务器启动的其他问题，则退出应用
  });

// 🚀 重新设计：更完善的优雅关闭处理函数
const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    logger.warn('正在关闭中，忽略重复信号');
    return;
  }
  
  isShuttingDown = true;
  logger.info(`收到信号 ${signal}，开始优雅停机...`);
  
  // 1. 停止接受新请求
  if (server) {
    server.close(async () => {
      logger.info('HTTP 服务器已关闭，不再接受新请求。');
      
      // 2. 清理 StatsCache
      if (statsCache && typeof statsCache.forceFlush === 'function') {
        try {
          logger.info('开始刷新 StatsCache 到数据库...');
          await statsCache.forceFlush();
          logger.info('StatsCache 已成功刷新。');
        } catch (cacheError) {
          logger.error('刷新 StatsCache 失败:', cacheError);
        }
      }
      
      // 3. 关闭 Redis 连接
      if (redisClient && typeof redisClient.quit === 'function') {
        try {
          logger.info('开始关闭 Redis 连接...');
          await redisClient.quit(); // quit 会等待命令完成
          logger.info('Redis 连接已成功关闭。');
        } catch (redisError) {
          logger.error('关闭 Redis 连接失败:', redisError);
        }
      }
      
      // 4. 关闭数据库连接
      try {
        logger.info('开始关闭数据库连接...');
        const { sequelize } = require('./models/index');
        await sequelize.close();
        logger.info('数据库连接已成功关闭。');
      } catch (dbError) {
        logger.error('关闭数据库连接失败:', dbError);
      }
      
      logger.info('所有资源已释放，服务器优雅退出。');
      process.exit(0);
    });

    // 如果在超时时间内服务器仍未关闭，则强制关闭
    setTimeout(() => {
      logger.warn('服务器关闭超时，强制退出。');
      process.exit(1);
    }, 10000); // 10秒超时
  }
};

// 🚀 改进：Windows兼容的信号处理
if (process.platform === 'win32') {
  // Windows系统特殊处理
  require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  }).on('SIGINT', () => {
    gracefulShutdown('SIGINT');
  });
} else {
  // Unix/Linux系统
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT'));
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝:', reason);
  gracefulShutdown('unhandledRejection');
});

// 🚀 添加：防止进程挂起
process.on('beforeExit', (code) => {
  logger.info(`进程即将退出，代码: ${code}`);
});

process.on('exit', (code) => {
  logger.info(`进程已退出，代码: ${code}`);
});

module.exports = app; 