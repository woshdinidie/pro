const logger = require('../utils/logger');

/**
 * 全局错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
  // 记录错误信息
  logger.error(`${req.method} ${req.url} - 错误: ${err.message}`);
  logger.error(err.stack);

  // 序列化验证错误(如果有)
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      code: 400,
      msg: '数据验证错误',
      data: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  // JWT错误处理
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      code: 401,
      msg: '未授权或登录已过期',
      data: null
    });
  }

  // 默认HTTP 500错误
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    code: statusCode,
    msg: err.message || '服务器内部错误',
    data: null
  });
};

module.exports = errorHandler; 