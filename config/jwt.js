const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'answer_quiz_secret_key';
// JWT过期时间
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * 生成JWT令牌
 * @param {Object} payload - 要编码到令牌中的数据
 * @returns {string} JWT令牌
 */
const generateToken = (payload) => {
  try {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  } catch (error) {
    logger.error('生成JWT令牌失败:', error);
    return null;
  }
};

/**
 * 验证JWT令牌
 * @param {string} token - 要验证的JWT令牌
 * @returns {Object|null} 解码后的数据或null(如果验证失败)
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    logger.error('验证JWT令牌失败:', error);
    return null;
  }
};

module.exports = {
  generateToken,
  verifyToken,
  JWT_SECRET,
  JWT_EXPIRES_IN
}; 