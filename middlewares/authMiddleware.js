const jwt = require('jsonwebtoken');
const config = require('../config/config');
const response = require('../utils/response');
const logger = require('../utils/logger');

/**
 * 认证中间件 - 验证用户JWT Token
 */
const authMiddleware = (req, res, next) => {
  try {
    // 获取请求头中的Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return response.unauthorized(res, '未提供认证令牌');
    }
    
    // 验证Token格式
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return response.unauthorized(res, '认证令牌格式错误');
    }
    
    const token = parts[1];
    
    // 验证Token
    jwt.verify(token, config.jwt.secret, (err, decoded) => {
      if (err) {
        logger.error('Token验证失败:', err);
        return response.unauthorized(res, '认证令牌无效或已过期');
      }
      
      // 将解码后的用户信息添加到请求对象中
      req.user = decoded;
      next();
    });
  } catch (error) {
    logger.error('认证中间件错误:', error);
    return response.serverError(res, '认证处理失败');
  }
};

module.exports = authMiddleware; 