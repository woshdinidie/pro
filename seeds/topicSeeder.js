const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

// 社区话题数据
const topics = [
  {
    user_id: 1, // 模拟用户ID，实际应根据真实用户ID
    title: '分享我的理财心得',
    content: `理财是每个人都应该学习的技能，分享几点个人心得：
    
1. 量入为出，控制支出
2. 合理分配资金，建立"收入-储蓄-支出"模式
3. 分散投资，不要把鸡蛋放在一个篮子里
4. 从小额开始，积累经验
5. 持续学习金融知识，提高理财能力

希望对大家有所帮助！`,
    images: JSON.stringify(["finance_topic1.png", "finance_topic2.png"]),
    view_count: 120,
    like_count: 35,
    comment_count: 12,
    status: 1
  },
  {
    user_id: 2,
    title: '心肺复苏急救知识人人必备',
    content: `最近参加了一个急救培训，学习了心肺复苏术(CPR)，感觉这是一项人人都应该掌握的技能。
    
心肺复苏的基本步骤：
1. 判断意识：轻拍肩膀，询问"你还好吗？"
2. 呼救：呼叫120，寻求AED
3. 判断呼吸：观察胸部起伏
4. 胸外按压：按压深度5-6厘米，频率100-120次/分钟
5. 人工呼吸：如果经过培训且愿意，可以进行人工呼吸

记住：在救护人员到达前，持续按压比什么都不做更能挽救生命！`,
    images: JSON.stringify(["cpr_topic.png"]),
    view_count: 85,
    like_count: 28,
    comment_count: 8,
    status: 1
  },
  {
    user_id: 3,
    title: '我是如何坚持每天答题提升自己的',
    content: `半年前开始使用这个答题小程序，每天坚持答题，不仅获得了不少积分和奖品，更重要的是学到了很多知识。
    
我的答题习惯：
1. 每天固定时间答题，养成习惯
2. 优先选择不熟悉的领域，拓展知识面
3. 遇到不会的题目，认真阅读解析并记录
4. 定期复习错题，巩固知识点
5. 参与PK对战，提高应变能力

通过坚持答题，我的知识储备和反应能力都有了明显提升，推荐大家也养成这个习惯！`,
    images: JSON.stringify([]),
    view_count: 156,
    like_count: 47,
    comment_count: 15,
    status: 1
  },
  {
    user_id: 4,
    title: '使用信用卡的几个小陷阱分享',
    content: `作为一个使用信用卡多年的老用户，想分享几个容易踩的坑：
    
1. 最低还款陷阱：只还最低还款额，剩余部分将产生高额利息
2. 取现手续费：信用卡取现除了手续费，从取现当天就开始计息
3. 免息期误解：免息期只适用于消费，不适用于取现和分期
4. 自动分期：有些商户会默认选择分期付款，产生额外费用
5. 附加费用：年费、短信提醒费、境外交易手续费等容易被忽视的费用

希望这些提醒能帮助大家更合理地使用信用卡！`,
    images: JSON.stringify(["credit_card_topic.png"]),
    view_count: 204,
    like_count: 52,
    comment_count: 19,
    status: 1
  },
  {
    user_id: 5,
    title: '防诈骗小技巧分享',
    content: `最近诈骗手段层出不穷，总结几点防诈骗技巧：
    
1. 陌生来电要谨慎，不要轻信自称是公检法的电话
2. 不要点击不明链接，特别是短信中的链接
3. 个人信息保密，不透露验证码、银行卡信息
4. 转账前多次确认，大额转账最好当面办理
5. 投资理财需谨慎，高回报通常伴随高风险
6. 安装正规防诈骗软件，及时了解新型诈骗手段

如果遇到可疑情况，可以拨打110或者咨询家人朋友。`,
    images: JSON.stringify(["anti_fraud_topic1.png", "anti_fraud_topic2.png"]),
    view_count: 175,
    like_count: 63,
    comment_count: 22,
    status: 1
  }
];

// 示例评论数据
const comments = [
  {
    topic_id: 1,
    user_id: 6,
    content: '感谢分享，理财确实要从小额开始，循序渐进。',
    parent_id: null,
    status: 1
  },
  {
    topic_id: 1,
    user_id: 7,
    content: '我也是这么认为的，先存钱再理财。',
    parent_id: null,
    status: 1
  },
  {
    topic_id: 2,
    user_id: 8,
    content: '这些急救知识太重要了，可惜很多人不了解。',
    parent_id: null,
    status: 1
  },
  {
    topic_id: 3,
    user_id: 9,
    content: '我也是这个小程序的忠实用户，每天都会答题！',
    parent_id: null,
    status: 1
  },
  {
    topic_id: 3,
    user_id: 10,
    content: '请问你一般在什么时间答题效率最高？',
    parent_id: null,
    status: 1
  },
  {
    topic_id: 3,
    user_id: 3,
    content: '我习惯在早上起床后答题，大脑比较清醒。',
    parent_id: 5, // 回复上面的评论
    status: 1
  },
  {
    topic_id: 4,
    user_id: 11,
    content: '说得太对了，我就因为最低还款吃过亏。',
    parent_id: null,
    status: 1
  },
  {
    topic_id: 5,
    user_id: 12,
    content: '现在诈骗手段真是层出不穷，我们要时刻保持警惕。',
    parent_id: null,
    status: 1
  }
];

// 导入社区话题数据
const seedTopics = async () => {
  try {
    logger.info('开始导入社区话题数据...');
    
    // 检查topic表是否存在
    try {
      await sequelize.query('SELECT 1 FROM topic LIMIT 1');
    } catch (error) {
      logger.error('topic表不存在，请先创建表结构');
      return;
    }
    
    // 检查comment表是否存在
    try {
      await sequelize.query('SELECT 1 FROM comment LIMIT 1');
    } catch (error) {
      logger.error('comment表不存在，请先创建表结构');
      return;
    }
    
    // 检查是否已有话题数据
    const [topicResults] = await sequelize.query('SELECT COUNT(*) as count FROM topic');
    const topicCount = topicResults[0].count;
    
    if (topicCount > 0) {
      logger.info(`话题表已有 ${topicCount} 条数据，跳过导入`);
    } else {
      // 创建测试用户(如果不存在)
      const [userResults] = await sequelize.query('SELECT COUNT(*) as count FROM user');
      const userCount = userResults[0].count;
      
      if (userCount === 0) {
        logger.info('创建测试用户...');
        for (let i = 1; i <= 12; i++) {
          const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
          await sequelize.query(`
            INSERT INTO user (id, openid, nickname, avatar, points, level, created_at, updated_at)
            VALUES (${i}, 'test_openid_${i}', '测试用户${i}', 'avatar${i}.png', ${i * 100}, ${Math.ceil(i/3)}, '${now}', '${now}')
          `);
        }
        logger.info('测试用户创建完成');
      }
      
      // 导入话题数据
      const topicValues = topics.map(topic => {
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        return `(${topic.user_id}, '${topic.title}', '${topic.content.replace(/'/g, "''")}', '${topic.images}', ${topic.view_count}, ${topic.like_count}, ${topic.comment_count}, ${topic.status}, '${now}', '${now}')`;
      }).join(', ');
      
      const insertTopicQuery = `
        INSERT INTO topic (user_id, title, content, images, view_count, like_count, comment_count, status, created_at, updated_at)
        VALUES ${topicValues}
      `;
      
      await sequelize.query(insertTopicQuery);
      logger.info(`成功导入 ${topics.length} 条话题数据`);
    }
    
    // 检查是否已有评论数据
    const [commentResults] = await sequelize.query('SELECT COUNT(*) as count FROM comment');
    const commentCount = commentResults[0].count;
    
    if (commentCount > 0) {
      logger.info(`评论表已有 ${commentCount} 条数据，跳过导入`);
    } else {
      // 导入评论数据
      const commentValues = comments.map(comment => {
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const parentId = comment.parent_id ? comment.parent_id : 'NULL';
        return `(${comment.topic_id}, ${comment.user_id}, '${comment.content.replace(/'/g, "''")}', ${parentId}, ${comment.status}, '${now}')`;
      }).join(', ');
      
      const insertCommentQuery = `
        INSERT INTO comment (topic_id, user_id, content, parent_id, status, created_at)
        VALUES ${commentValues}
      `;
      
      await sequelize.query(insertCommentQuery);
      logger.info(`成功导入 ${comments.length} 条评论数据`);
    }
    
  } catch (error) {
    logger.error('社区话题数据导入失败:', error);
    throw error;
  }
};

module.exports = seedTopics; 