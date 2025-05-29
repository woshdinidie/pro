const { sequelize } = require('../config/database');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

async function migrateLotteryFeatures() {
  try {
    // 读取迁移SQL文件
    const sqlFilePath = path.join(__dirname, '../migrations/add_lottery_features.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    // 分割SQL语句（按分号分割）
    const statements = sql.split(';').filter(statement => statement.trim().length > 0);
    
    logger.info('开始执行抽奖功能迁移...');
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await sequelize.query(statement);
          logger.info('执行SQL成功:', statement.trim().substring(0, 50) + '...');
        } catch (error) {
          if (error.original && error.original.code === 'ER_DUP_FIELDNAME') {
            logger.info('字段已存在，跳过:', statement.trim().substring(0, 50) + '...');
          } else if (error.original && error.original.code === 'ER_TABLE_EXISTS_ERROR') {
            logger.info('表已存在，跳过:', statement.trim().substring(0, 50) + '...');
          } else {
            logger.error('执行SQL失败:', error);
            throw error;
          }
        }
      }
    }
    
    logger.info('抽奖功能迁移完成！');
    return true;
  } catch (error) {
    logger.error('迁移失败:', error);
    return false;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  migrateLotteryFeatures().then(success => {
    if (success) {
      logger.info('迁移成功完成');
      process.exit(0);
    } else {
      logger.error('迁移失败');
      process.exit(1);
    }
  });
}

module.exports = { migrateLotteryFeatures }; 