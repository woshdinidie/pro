const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

// 首页配置数据
const homeConfigItems = [
  // 头图配置
  {
    type: 1, // 1-头图
    title: '欢迎参与有奖答题',
    image_url: 'banner1.png',
    link_url: '/pages/quiz/quiz',
    order_num: 1,
    status: 1
  },
  {
    type: 1, // 1-头图
    title: 'PK赢大奖',
    image_url: 'banner2.png',
    link_url: '/pages/pk/pk',
    order_num: 2,
    status: 1
  },
  {
    type: 1, // 1-头图
    title: '知识就是力量',
    image_url: 'banner3.png',
    link_url: '/pages/knowledge/knowledge',
    order_num: 3,
    status: 1
  },
  
  // 资讯配置
  {
    type: 2, // 2-资讯
    title: '王先生获得iPhone 13一部',
    image_url: '',
    link_url: '',
    order_num: 1,
    status: 1
  },
  {
    type: 2, // 2-资讯
    title: '李女士兑换小米手环5个',
    image_url: '',
    link_url: '',
    order_num: 2,
    status: 1
  },
  {
    type: 2, // 2-资讯
    title: '张先生连续答对50题，获得1000积分',
    image_url: '',
    link_url: '',
    order_num: 3,
    status: 1
  },
  {
    type: 2, // 2-资讯
    title: '赵女士PK获胜，积分翻倍',
    image_url: '',
    link_url: '',
    order_num: 4,
    status: 1
  },
  
  // 热门话题配置
  {
    type: 3, // 3-话题
    title: '#理财小技巧分享#',
    image_url: 'topic1.png',
    link_url: '/pages/community/detail?id=1',
    order_num: 1,
    status: 1
  },
  {
    type: 3, // 3-话题
    title: '#健康生活每一天#',
    image_url: 'topic2.png',
    link_url: '/pages/community/detail?id=2',
    order_num: 2,
    status: 1
  },
  {
    type: 3, // 3-话题
    title: '#答题技巧大揭秘#',
    image_url: 'topic3.png',
    link_url: '/pages/community/detail?id=3',
    order_num: 3,
    status: 1
  }
];

// 导入首页配置数据
const seedHomeConfig = async () => {
  try {
    logger.info('开始导入首页配置数据...');
    
    // 检查首页配置表是否存在
    try {
      await sequelize.query('SELECT 1 FROM home_config LIMIT 1');
    } catch (error) {
      // 首页配置表不存在，创建表
      logger.info('首页配置表不存在，创建home_config表...');
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS home_config (
          id INT AUTO_INCREMENT PRIMARY KEY,
          type TINYINT NOT NULL COMMENT '类型：1-头图，2-资讯，3-话题',
          title VARCHAR(100) COMMENT '标题',
          image_url VARCHAR(255) COMMENT '图片URL',
          link_url VARCHAR(255) COMMENT '链接URL',
          order_num INT COMMENT '排序',
          status TINYINT DEFAULT 1 COMMENT '状态：1-启用，0-禁用',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      logger.info('home_config表创建完成');
    }
    
    // 检查是否已有数据
    const [results] = await sequelize.query('SELECT COUNT(*) as count FROM home_config');
    const count = results[0].count;
    
    if (count > 0) {
      logger.info(`首页配置表已有 ${count} 条数据，跳过导入`);
      return;
    }
    
    // 准备插入数据
    const values = homeConfigItems.map(item => {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      return `(${item.type}, '${item.title}', '${item.image_url}', '${item.link_url}', ${item.order_num}, ${item.status}, '${now}', '${now}')`;
    }).join(', ');
    
    // 执行插入操作
    const insertQuery = `
      INSERT INTO home_config (type, title, image_url, link_url, order_num, status, created_at, updated_at)
      VALUES ${values}
    `;
    
    await sequelize.query(insertQuery);
    logger.info(`成功导入 ${homeConfigItems.length} 条首页配置数据`);
  } catch (error) {
    logger.error('首页配置数据导入失败:', error);
    throw error;
  }
};

module.exports = seedHomeConfig; 