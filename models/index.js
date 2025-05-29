const { sequelize, Sequelize } = require('../config/database');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const db = {};

// 读取当前目录下所有的模型文件并导入
fs.readdirSync(__dirname)
  .filter(file => {
    return (file.indexOf('.') !== 0) && (file !== 'index.js') && (file.slice(-3) === '.js');
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

// 设置模型之间的关联关系
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// 初始化所有模型
const initModels = async () => {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    logger.info('数据库连接成功');
    
    // 同步模型到数据库(不强制创建表)
    // await sequelize.sync({ force: false });
    // logger.info('数据库模型同步完成');
    
    return true;
  } catch (error) {
    logger.error('数据库初始化失败:', error);
    return false;
  }
};

module.exports = {
  ...db,
  initModels
}; 