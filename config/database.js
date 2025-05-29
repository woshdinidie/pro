const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// 配置数据库连接
const sequelize = new Sequelize(
  process.env.DB_NAME || 'answer_pro',
  process.env.DB_USER || 'root',
  'wxx0324', // 直接设置密码
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: (msg) => logger.debug(msg),
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,  // 默认添加 createdAt 和 updatedAt
      underscored: true, // 使用下划线命名法
      paranoid: true     // 软删除
    }
  }
);

// 测试连接函数
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('数据库连接成功');
    return true;
  } catch (error) {
    logger.error('数据库连接失败:', error);
    return false;
  }
};

module.exports = {
  sequelize,
  Sequelize,
  testConnection
}; 