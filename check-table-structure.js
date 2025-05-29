require('dotenv').config();
const { sequelize } = require('./config/database');

async function checkTableStructure() {
  try {
    console.log('=== 检查实际数据库表结构 ===\n');
    
    // 检查用户表结构
    console.log('1. USER 表结构:');
    const [userColumns] = await sequelize.query('DESCRIBE user');
    console.table(userColumns);
    
    // 检查奖品表结构
    console.log('\n2. PRIZE 表结构:');
    const [prizeColumns] = await sequelize.query('DESCRIBE prize');
    console.table(prizeColumns);
    
    // 检查奖品记录表结构
    console.log('\n3. PRIZE_RECORD 表结构:');
    const [prizeRecordColumns] = await sequelize.query('DESCRIBE prize_record');
    console.table(prizeRecordColumns);
    
    // 检查match_record表结构
    console.log('\n4. MATCH_RECORD 表结构:');
    const [matchRecordColumns] = await sequelize.query('DESCRIBE match_record');
    console.table(matchRecordColumns);
    
    console.log('\n=== 检查完成 ===');
    
  } catch (error) {
    console.error('检查表结构时出错:', error);
  } finally {
    process.exit(0);
  }
}

checkTableStructure(); 