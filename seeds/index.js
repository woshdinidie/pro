const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

// 导入各个种子模块
const seedCategories = require('./categorySeeder');
const seedQuestions = require('./questionSeeder');
const seedPrizes = require('./prizeSeeder');
const seedKnowledge = require('./knowledgeSeeder');
const seedHomeConfig = require('./homeConfigSeeder');
const seedTopics = require('./topicSeeder');

// 执行所有种子导入
const seedAll = async () => {
  try {
    logger.info('开始导入基础数据...');
    
    // 按优先级顺序执行
    await seedCategories();
    await seedQuestions();
    await seedPrizes();
    await seedKnowledge();
    await seedHomeConfig();
    await seedTopics();
    
    logger.info('数据导入完成！');
    
    // 所有数据导入完成后退出进程
    process.exit(0);
  } catch (error) {
    logger.error('数据导入失败:', error);
    process.exit(1);
  }
};

// 单独执行种子函数
const runSeed = async (seedName) => {
  try {
    switch (seedName) {
      case 'categories':
        await seedCategories();
        break;
      case 'questions':
        await seedQuestions();
        break;
      case 'prizes':
        await seedPrizes();
        break;
      case 'knowledge':
        await seedKnowledge();
        break;
      case 'homeconfig':
        await seedHomeConfig();
        break;
      case 'topics':
        await seedTopics();
        break;
      default:
        logger.error(`未知的种子名称: ${seedName}`);
        break;
    }
    logger.info(`${seedName} 数据导入完成！`);
    process.exit(0);
  } catch (error) {
    logger.error(`${seedName} 数据导入失败:`, error);
    process.exit(1);
  }
};

// 检查命令行参数，支持单独运行某个种子脚本
if (process.argv.length > 2) {
  const seedName = process.argv[2];
  runSeed(seedName);
} else {
  // 默认执行全部种子脚本
  seedAll();
} 