const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

// 题目数据 - 为了简化，我们只创建部分题目示例
const questions = [
  // 金融常识类题目 (category_id = 1)
  {
    category_id: 1,
    title: '以下哪项不是银行的基本功能？',
    options: JSON.stringify([
      {"id": "A", "text": "存款业务"},
      {"id": "B", "text": "贷款业务"},
      {"id": "C", "text": "证券交易"},
      {"id": "D", "text": "支付结算"}
    ]),
    answer: 'C',
    analysis: '银行的基本功能包括存款业务、贷款业务、支付结算等，证券交易主要由证券公司等专业金融机构提供。',
    difficulty: 1,
    points: 10,
    status: 1
  },
  {
    category_id: 1,
    title: '下列哪种储蓄方式的风险最低？',
    options: JSON.stringify([
      {"id": "A", "text": "股票投资"},
      {"id": "B", "text": "银行定期存款"},
      {"id": "C", "text": "基金投资"},
      {"id": "D", "text": "外汇交易"}
    ]),
    answer: 'B',
    analysis: '银行定期存款属于保本保息的储蓄方式，风险最低，而股票、基金、外汇交易都有一定的市场风险。',
    difficulty: 1,
    points: 10,
    status: 1
  },
  {
    category_id: 1,
    title: '信用卡的免息期是指什么？',
    options: JSON.stringify([
      {"id": "A", "text": "可以永久免息的时间"},
      {"id": "B", "text": "从刷卡消费到还款日之间的时间"},
      {"id": "C", "text": "信用卡逾期后的宽限期"},
      {"id": "D", "text": "提现免息的时间"}
    ]),
    answer: 'B',
    analysis: '信用卡免息期是指从刷卡消费日到账单还款日之间的时间，在此期间内全额还款不收取利息。',
    difficulty: 2,
    points: 15,
    status: 1
  },

  // 生活常识类题目 (category_id = 2)
  {
    category_id: 2,
    title: '以下哪种食物不适合放入冰箱冷藏？',
    options: JSON.stringify([
      {"id": "A", "text": "西红柿"},
      {"id": "B", "text": "巧克力"},
      {"id": "C", "text": "香蕉"},
      {"id": "D", "text": "牛奶"}
    ]),
    answer: 'C',
    analysis: '香蕉在低温环境下会加速变黑、腐烂，不适合放入冰箱冷藏。而西红柿、巧克力和牛奶则适合冷藏保存。',
    difficulty: 1,
    points: 10,
    status: 1
  },
  {
    category_id: 2,
    title: '使用微波炉时，以下哪种容器不适合使用？',
    options: JSON.stringify([
      {"id": "A", "text": "玻璃容器"},
      {"id": "B", "text": "陶瓷容器"},
      {"id": "C", "text": "金属容器"},
      {"id": "D", "text": "塑料容器"}
    ]),
    answer: 'C',
    analysis: '金属容器在微波炉中会产生电火花，可能损坏微波炉或引发火灾，因此不适合在微波炉中使用。',
    difficulty: 1,
    points: 10,
    status: 1
  },

  // 法律知识类题目 (category_id = 3)
  {
    category_id: 3,
    title: '根据我国民法典，我国民事行为能力的完全民事行为能力年龄为？',
    options: JSON.stringify([
      {"id": "A", "text": "16周岁"},
      {"id": "B", "text": "18周岁"},
      {"id": "C", "text": "20周岁"},
      {"id": "D", "text": "21周岁"}
    ]),
    answer: 'B',
    analysis: '根据《中华人民共和国民法典》规定，年满18周岁的公民为成年人，具有完全民事行为能力。',
    difficulty: 2,
    points: 15,
    status: 1
  },
  {
    category_id: 3,
    title: '以下哪种情况下签订的合同无效？',
    options: JSON.stringify([
      {"id": "A", "text": "双方自愿签订的房屋租赁合同"},
      {"id": "B", "text": "一方是16岁未成年人签订的购买学习用品的合同"},
      {"id": "C", "text": "采用欺诈手段签订的合同"},
      {"id": "D", "text": "口头达成的小额借款合同"}
    ]),
    answer: 'C',
    analysis: '根据《中华人民共和国民法典》规定，采用欺诈、胁迫等手段签订的合同属于可撤销合同，受害方有权请求法院或仲裁机构撤销。',
    difficulty: 3,
    points: 20,
    status: 1
  },

  // 健康医疗类题目 (category_id = 4)
  {
    category_id: 4,
    title: '以下哪种食物含钙量最高？',
    options: JSON.stringify([
      {"id": "A", "text": "牛奶"},
      {"id": "B", "text": "菠菜"},
      {"id": "C", "text": "豆腐"},
      {"id": "D", "text": "猪肉"}
    ]),
    answer: 'A',
    analysis: '牛奶是钙的最佳来源之一，每100克牛奶含钙约120毫克，比菠菜、豆腐和猪肉都要高。',
    difficulty: 1,
    points: 10,
    status: 1
  },
  {
    category_id: 4,
    title: '急性心肌梗塞发作时，以下哪种做法是错误的？',
    options: JSON.stringify([
      {"id": "A", "text": "立即拨打急救电话"},
      {"id": "B", "text": "保持平卧，松开衣物"},
      {"id": "C", "text": "含服硝酸甘油"},
      {"id": "D", "text": "立即激烈运动，促进血液循环"}
    ]),
    answer: 'D',
    analysis: '心肌梗塞发作时应立即停止活动，保持平卧状态，切勿运动，以免加重心脏负担。正确做法是拨打急救电话，松开衣物，必要时在医生指导下服用药物。',
    difficulty: 2,
    points: 15,
    status: 1
  },

  // 更多题目...可以继续添加其他分类的题目
];

// 导入题目数据
const seedQuestions = async () => {
  try {
    logger.info('开始导入题目数据...');
    
    // 检查是否已有数据
    const [results] = await sequelize.query('SELECT COUNT(*) as count FROM question');
    const count = results[0].count;
    
    if (count > 0) {
      logger.info(`题目表已有 ${count} 条数据，跳过导入`);
      return;
    }
    
    // 查询分类是否存在
    const [categories] = await sequelize.query('SELECT id FROM category');
    if (categories.length === 0) {
      logger.error('无法导入题目：分类数据不存在');
      return;
    }
    
    // 准备插入数据
    const values = questions.map(question => {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      return `(${question.category_id}, '${question.title}', '${question.options.replace(/'/g, "''")}', '${question.answer}', '${question.analysis.replace(/'/g, "''")}', ${question.difficulty}, ${question.points}, ${question.status}, '${now}', '${now}')`;
    }).join(', ');
    
    // 执行插入操作
    const insertQuery = `
      INSERT INTO question (category_id, title, options, answer, analysis, difficulty, points, status, created_at, updated_at)
      VALUES ${values}
    `;
    
    await sequelize.query(insertQuery);
    logger.info(`成功导入 ${questions.length} 条题目数据`);
  } catch (error) {
    logger.error('题目数据导入失败:', error);
    throw error;
  }
};

module.exports = seedQuestions; 