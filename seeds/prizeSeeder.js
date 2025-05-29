const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

// 奖品数据
const prizes = [
  // 现金红包
  {
    name: '128元现金红包',
    description: '可直接提现到微信钱包',
    image: 'red_packet_128.png',
    point_cost: 1000,
    type: 1,
    value: 128.00,
    probability: 0.01,
    status: 1
  },
  {
    name: '88元现金红包',
    description: '可直接提现到微信钱包',
    image: 'red_packet_88.png',
    point_cost: 800,
    type: 1,
    value: 88.00,
    probability: 0.05,
    status: 1
  },
  {
    name: '68元现金红包',
    description: '可直接提现到微信钱包',
    image: 'red_packet_68.png',
    point_cost: 600,
    type: 1,
    value: 68.00,
    probability: 0.10,
    status: 1
  },
  {
    name: '28元现金红包',
    description: '可直接提现到微信钱包',
    image: 'red_packet_28.png',
    point_cost: 300,
    type: 1,
    value: 28.00,
    probability: 0.20,
    status: 1
  },
  {
    name: '10-20元现金红包',
    description: '随机金额，可直接提现到微信钱包',
    image: 'red_packet_10_20.png',
    point_cost: 200,
    type: 1,
    value: 15.00,
    probability: 0.30,
    status: 1
  },
  {
    name: '0-5元现金红包',
    description: '随机金额，可直接提现到微信钱包',
    image: 'red_packet_0_5.png',
    point_cost: 100,
    type: 1,
    value: 2.50,
    probability: 0.34,
    status: 1
  },
  
  // 积分奖励
  {
    name: '100积分',
    description: '可用于抽奖或兑换其他奖品',
    image: 'points_100.png',
    point_cost: 50,
    type: 2,
    value: 100.00,
    probability: 0.50,
    status: 1
  },
  {
    name: '50积分',
    description: '可用于抽奖或兑换其他奖品',
    image: 'points_50.png',
    point_cost: 30,
    type: 2,
    value: 50.00,
    probability: 0.70,
    status: 1
  },
  {
    name: '20积分',
    description: '可用于抽奖或兑换其他奖品',
    image: 'points_20.png',
    point_cost: 10,
    type: 2,
    value: 20.00,
    probability: 0.90,
    status: 1
  }
];

// 导入奖品数据
const seedPrizes = async () => {
  try {
    logger.info('开始导入奖品数据...');
    
    // 检查是否已有数据
    const [results] = await sequelize.query('SELECT COUNT(*) as count FROM prize');
    const count = results[0].count;
    
    if (count > 0) {
      logger.info(`奖品表已有 ${count} 条数据，跳过导入`);
      return;
    }
    
    // 准备插入数据
    const values = prizes.map(prize => {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      return `('${prize.name}', '${prize.description.replace(/'/g, "''")}', '${prize.image}', ${prize.point_cost}, ${prize.type}, ${prize.value}, ${prize.probability}, ${prize.status}, '${now}', '${now}')`;
    }).join(', ');
    
    // 执行插入操作
    const insertQuery = `
      INSERT INTO prize (name, description, image, point_cost, type, value, probability, status, created_at, updated_at)
      VALUES ${values}
    `;
    
    await sequelize.query(insertQuery);
    logger.info(`成功导入 ${prizes.length} 条奖品数据`);
  } catch (error) {
    logger.error('奖品数据导入失败:', error);
    throw error;
  }
};

module.exports = seedPrizes; 