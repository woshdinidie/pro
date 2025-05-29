const { verifyToken } = require('../config/jwt');
const response = require('../utils/response');
const logger = require('../utils/logger');

/**
 * 用户认证中间件
 * 检查请求头中的JWT令牌
 */
const authenticate = (req, res, next) => {
  try {
    // 从请求头获取令牌
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      logger.warn('认证失败: 未提供Authorization头');
      return response.unauthorized(res);
    }

    // 格式：Bearer {token}
    const token = authHeader.split(' ')[1];
    if (!token) {
      logger.warn('认证失败: 无效的Authorization格式');
      return response.unauthorized(res);
    }

    // 验证令牌
    const decoded = verifyToken(token);
    if (!decoded) {
      logger.warn('认证失败: 无效的令牌');
      return response.unauthorized(res);
    }

    // 将用户信息添加到请求对象
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('认证异常:', error);
    return response.unauthorized(res);
  }
};

// 为了兼容性，添加auth作为authenticate的别名
const auth = authenticate;

module.exports = { authenticate, auth }; 