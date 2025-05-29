const db = require('../models');
const logger = require('../utils/logger');

async function syncModels() {
  try {
    console.log('开始同步数据库模型...');
    
    // 同步模型到数据库
    await db.sequelize.sync({ alter: true });
    
    console.log('数据库模型同步完成！');
    process.exit(0);
  } catch (error) {
    console.error('数据库同步失败:', error);
    process.exit(1);
  }
}

syncModels(); 