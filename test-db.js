require('dotenv').config();
const { sequelize, testConnection } = require('./config/database');

console.log('环境变量:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
console.log('DB_NAME:', process.env.DB_NAME);

async function testDb() {
  try {
    const result = await testConnection();
    if (result) {
      console.log('数据库连接成功!');
      
      // 查询测试
      try {
        const [results] = await sequelize.query('SHOW TABLES');
        console.log('数据库表:');
        console.log(results);
      } catch (error) {
        console.error('查询表失败:', error);
      }
    }
  } catch (error) {
    console.error('测试连接时出错:', error);
  } finally {
    process.exit(0);
  }
}

testDb(); 