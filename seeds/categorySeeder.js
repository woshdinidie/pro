const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

// 检查环境变量
console.log('验证数据库配置:');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);

// 分类数据
const categories = [
  {
    name: '金融常识',
    description: '基础金融知识，包括银行、理财、保险等内容',
    icon: 'finance.png',
    sort_order: 1,
    status: 1
  },
  {
    name: '生活常识',
    description: '日常生活中的实用知识',
    icon: 'life.png',
    sort_order: 2,
    status: 1
  },
  {
    name: '法律知识',
    description: '常见法律问题和基本法律常识',
    icon: 'law.png',
    sort_order: 3,
    status: 1
  },
  {
    name: '健康医疗',
    description: '健康保健和基本医疗知识',
    icon: 'health.png',
    sort_order: 4,
    status: 1
  },
  {
    name: '科技数码',
    description: '科技产品使用技巧和数码知识',
    icon: 'tech.png',
    sort_order: 5,
    status: 1
  },
  {
    name: '文化历史',
    description: '中国传统文化和历史知识',
    icon: 'culture.png',
    sort_order: 6,
    status: 1
  },
  {
    name: '环保知识',
    description: '环境保护和可持续发展相关知识',
    icon: 'environment.png',
    sort_order: 7,
    status: 1
  },
  {
    name: '安全常识',
    description: '居家安全和个人防护知识',
    icon: 'safety.png',
    sort_order: 8,
    status: 1
  }
];

// 导入分类数据
const seedCategories = async () => {
  try {
    logger.info('开始导入分类数据...');
    
    // 检查是否已有数据
    const [results] = await sequelize.query('SELECT COUNT(*) as count FROM category');
    const count = results[0].count;
    
    if (count > 0) {
      logger.info(`分类表已有 ${count} 条数据，跳过导入`);
      return;
    }
    
    // 准备插入数据
    const values = categories.map(category => {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      return `('${category.name}', '${category.description}', '${category.icon}', ${category.sort_order}, ${category.status}, '${now}', '${now}')`;
    }).join(', ');
    
    // 执行插入操作
    const insertQuery = `
      INSERT INTO category (name, description, icon, sort_order, status, created_at, updated_at)
      VALUES ${values}
    `;
    
    await sequelize.query(insertQuery);
    logger.info(`成功导入 ${categories.length} 条分类数据`);
  } catch (error) {
    logger.error('分类数据导入失败:', error);
    throw error;
  }
};

module.exports = seedCategories; 