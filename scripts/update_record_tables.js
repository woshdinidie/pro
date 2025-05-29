const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

async function updateRecordTables() {
  try {
    console.log('开始更新数据表结构...');
    
    // 1. 修改answer_record表中user_id字段的类型为VARCHAR(32)
    await sequelize.query(`
      ALTER TABLE answer_record 
      MODIFY COLUMN user_id VARCHAR(32) NOT NULL COMMENT '用户ID';
    `);
    
    // 2. 检查user表中是否有phone字段，如果没有则添加
    const [columns] = await sequelize.query(`
      SHOW COLUMNS FROM user LIKE 'phone';
    `);
    
    if (columns.length === 0) {
      await sequelize.query(`
        ALTER TABLE user 
        ADD COLUMN phone VARCHAR(20) NULL COMMENT '手机号码';
      `);
      console.log('添加了user表的phone字段');
    } else {
      console.log('user表已有phone字段，跳过添加');
    }
    
    console.log('数据表结构更新完成！');
    process.exit(0);
  } catch (error) {
    console.error('更新数据表结构失败:', error);
    process.exit(1);
  }
}

updateRecordTables(); 