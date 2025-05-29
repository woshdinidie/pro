const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

// 知识内容数据
const knowledgeItems = [
  // 金融常识类知识 (category_id = 1)
  {
    title: '储蓄与投资的区别',
    content: `储蓄和投资是两种不同的理财方式：
    
1. 风险程度不同：储蓄基本无风险，投资有不同程度的风险。
2. 收益率不同：储蓄收益率稳定但较低，投资收益率波动但可能较高。
3. 流动性不同：储蓄的流动性通常高于投资。
4. 适用人群不同：储蓄适合低风险偏好者，投资适合风险承受能力较高的人群。

提示：理财应根据个人风险承受能力，合理配置储蓄与投资的比例。`,
    category_id: 1,
    view_count: 0,
    status: 1
  },
  {
    title: '如何正确使用信用卡',
    content: `信用卡是一种便捷的支付工具，但需要正确使用：
    
1. 按时还款：每月至少按时还最低还款额，最好全额还款，避免产生高额利息。
2. 控制额度：根据个人收入和消费能力合理使用信用卡，避免超支。
3. 注意安全：保护个人信息，定期查看账单，发现异常及时处理。
4. 善用免息期：了解信用卡免息期规则，合理安排消费和还款时间。
5. 避免取现：信用卡取现通常无免息期且手续费较高。

提示：信用卡是工具而非资金来源，应理性消费，避免过度负债。`,
    category_id: 1,
    view_count: 0,
    status: 1
  },
  
  // 生活常识类知识 (category_id = 2)
  {
    title: '食品保鲜的正确方法',
    content: `不同食物有不同的保鲜方法：
    
1. 肉类：适合冷冻保存，生熟分开。
2. 蔬菜：大部分适合冷藏，洗净晾干后保存。
3. 水果：部分水果如香蕉、番茄不适合冷藏，应在常温保存。
4. 面包：密封保存，避免风干。
5. 调味品：密封保存在阴凉干燥处。

提示：食品保鲜除了温度控制外，防潮、防氧化、避光也很重要。`,
    category_id: 2,
    view_count: 0,
    status: 1
  },
  {
    title: '家庭用电安全知识',
    content: `家庭用电安全关系到人身安全和财产安全：
    
1. 不要超负荷用电，避免同时使用多个大功率电器。
2. 定期检查电线是否老化，发现破损及时更换。
3. 不要用湿手触摸电器或插拔电源。
4. 电器不用时应关闭电源，长期不用的电器应拔掉插头。
5. 家中有小孩时，插座应安装保护盖。

提示：发生电器火灾时，应先切断电源，再使用适当灭火器材灭火。`,
    category_id: 2,
    view_count: 0,
    status: 1
  },
  
  // 法律知识类知识 (category_id = 3)
  {
    title: '常见合同签订注意事项',
    content: `签订合同前应注意以下几点：
    
1. 确认对方身份：核实对方真实身份和签约资格。
2. 明确合同内容：仔细阅读合同条款，不明确的条款应当要求解释。
3. 关注关键条款：特别注意合同金额、履行期限、违约责任等关键条款。
4. 保留证据：保留谈判过程中的记录和证据，以备不时之需。
5. 必要时咨询专业人士：对复杂合同可咨询律师等专业人士。

提示：口头合同也具有法律效力，但出于举证便利，重要合同应采用书面形式。`,
    category_id: 3,
    view_count: 0,
    status: 1
  },
  
  // 健康医疗类知识 (category_id = 4)
  {
    title: '正确的洗手方法',
    content: `正确洗手是预防疾病的重要措施，建议采用"七步洗手法"：
    
1. 掌心相对，手指并拢相互揉搓。
2. 掌心对手背，手指交叉揉搓，两手交换进行。
3. 掌心相对，手指交叉揉搓。
4. 弯曲手指使指背在对方掌心揉搓，两手交换进行。
5. 拇指在另一手掌中旋转揉搓，两手交换进行。
6. 指尖在另一手掌心揉搓，两手交换进行。
7. 揉搓手腕，两手交换进行。

提示：洗手时间应不少于20秒，特别是在进食前、如厕后、接触公共物品后。`,
    category_id: 4,
    view_count: 0,
    status: 1
  }
  
  // 可以继续添加其他分类的知识内容
];

// 导入知识内容数据
const seedKnowledge = async () => {
  try {
    logger.info('开始导入知识库内容...');
    
    // 检查知识表是否存在
    try {
      await sequelize.query('SELECT 1 FROM knowledge LIMIT 1');
    } catch (error) {
      // 知识表不存在，创建表
      logger.info('知识表不存在，创建knowledge表...');
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS knowledge (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(100) NOT NULL,
          content TEXT,
          category_id INT,
          view_count INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          status TINYINT DEFAULT 1,
          FOREIGN KEY (category_id) REFERENCES category(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      logger.info('knowledge表创建完成');
    }
    
    // 检查是否已有数据
    const [results] = await sequelize.query('SELECT COUNT(*) as count FROM knowledge');
    const count = results[0].count;
    
    if (count > 0) {
      logger.info(`知识表已有 ${count} 条数据，跳过导入`);
      return;
    }
    
    // 查询分类是否存在
    const [categories] = await sequelize.query('SELECT id FROM category');
    if (categories.length === 0) {
      logger.error('无法导入知识：分类数据不存在');
      return;
    }
    
    // 准备插入数据
    const values = knowledgeItems.map(item => {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      return `('${item.title}', '${item.content.replace(/'/g, "''")}', ${item.category_id}, ${item.view_count}, '${now}', '${now}', ${item.status})`;
    }).join(', ');
    
    // 执行插入操作
    const insertQuery = `
      INSERT INTO knowledge (title, content, category_id, view_count, created_at, updated_at, status)
      VALUES ${values}
    `;
    
    await sequelize.query(insertQuery);
    logger.info(`成功导入 ${knowledgeItems.length} 条知识内容数据`);
  } catch (error) {
    logger.error('知识内容数据导入失败:', error);
    throw error;
  }
};

module.exports = seedKnowledge; 