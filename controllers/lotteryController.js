const { User, LotteryRecord, AnswerRecord, sequelize } = require('../models');
const logger = require('../utils/logger');
const response = require('../utils/response');
const { Op } = require('sequelize');
const redisClient = require('../utils/redis');
const wechatPayService = require('../utils/wechatPayService');
const transferQueue = require('../utils/transferQueue');

/**
 * 开始抽奖
 */
const startLottery = async (req, res) => {
  const { user_id } = req.user;
  const transaction = await sequelize.transaction(); // 开始事务

  try {
    // 获取用户信息 (在事务内查询，并锁定记录以防止并发问题)
    const user = await User.findByPk(user_id, { transaction, lock: transaction.LOCK.UPDATE }); 
    if (!user) {
      await transaction.rollback();
      return res.json({
        code: 404,
        message: '用户不存在',
        data: null
      });
    }

    // 检查抽奖机会
    if (user.lottery_chances < 1) {
      await transaction.rollback();
      return res.json({
        code: 400,
        message: '您没有抽奖机会，请先完成答题',
        data: null
      });
    }

    // 奖品配置（保持硬编码）
    const prizes = [
      { id: 1, name: '128元现金', value: 128, type: 'money', probability: 1 },
      { id: 2, name: '88元现金', value: 88, type: 'money', probability: 2 },
      { id: 3, name: '68元现金', value: 68, type: 'money', probability: 3 },
      { id: 4, name: '28元现金', value: 28, type: 'money', probability: 5 },
      { id: 5, name: '0-5元随机', value: '0-5', type: 'random_money', probability: 15 },
      { id: 6, name: '10-20元随机', value: '10-20', type: 'random_money', probability: 10 },
      { id: 7, name: '积分奖励', value: '1-10', type: 'random_points', probability: 30 },
      { id: 8, name: '18元现金', value: 18, type: 'money', probability: 34 }
    ];

    // 根据概率抽奖
    const random = Math.random() * 100;
    let cumulativeProbability = 0;
    let selectedPrize = null;
    
    for (const prize of prizes) {
      cumulativeProbability += prize.probability;
      if (random <= cumulativeProbability) {
        selectedPrize = prize;
        break;
      }
    }
    
    // 如果没有选中（理论上不会发生），选择最后一个
    if (!selectedPrize) {
      selectedPrize = prizes[prizes.length - 1];
    }
    
    // 计算实际奖品值
    let actualValue = selectedPrize.value;
    let displayText = selectedPrize.name;
    
    if (selectedPrize.type === 'random_money') {
      if (selectedPrize.value === '0-5') {
        actualValue = Math.floor(Math.random() * 6); // 0-5
        displayText = `${actualValue}元现金红包`;
      } else if (selectedPrize.value === '10-20') {
        actualValue = Math.floor(Math.random() * 11) + 10; // 10-20
        displayText = `${actualValue}元现金红包`;
      }
    } else if (selectedPrize.type === 'random_points') {
      actualValue = Math.floor(Math.random() * 10) + 1; // 1-10
      displayText = `${actualValue}积分奖励`;
    } else if (selectedPrize.type === 'money') {
      displayText = `${actualValue}元现金红包`;
    }
    
    // 计算操作后的最终值
    const initialPoints = user.total_points;
    const initialChances = user.lottery_chances;

    let finalTotalPoints = initialPoints;
    const finalLotteryChances = initialChances - 1; // 必定减1

    // 1. 扣除抽奖机会
    await User.decrement(
      { lottery_chances: 1 }, 
      { where: { id: user_id }, transaction }
    );

    // 2. 发放奖品（如果是积分，则增加积分）
    if (selectedPrize.type === 'random_points' && actualValue > 0) {
      await User.increment(
        { total_points: actualValue }, 
        { where: { id: user_id }, transaction }
      );
      finalTotalPoints = initialPoints + actualValue;
    }
    
    // 3. 记录抽奖结果 - 🚀 新增转账相关字段
    const lotteryRecord = await LotteryRecord.create({
      user_id: user_id,
      prize_id: selectedPrize.id,
      prize_name: selectedPrize.name,
      prize_type: selectedPrize.type,
      prize_value: actualValue,
      status: 1, // 1表示已发放/完成
      transfer_status: selectedPrize.type === 'money' || selectedPrize.type === 'random_money' ? 'pending' : 'none',
      transfer_amount: (selectedPrize.type === 'money' || selectedPrize.type === 'random_money') ? actualValue : null
    }, { transaction });

    // 提交事务
    await transaction.commit();

    // 🚀 新增：如果是现金奖品，创建转账记录并加入队列
    if ((selectedPrize.type === 'money' || selectedPrize.type === 'random_money') && actualValue > 0) {
      try {
        await handleCashPrize(user_id, lotteryRecord.id, actualValue, displayText);
      } catch (transferError) {
        logger.error(`处理现金奖品失败 - 用户: ${user_id}, 抽奖记录: ${lotteryRecord.id}`, transferError);
        // 转账处理失败不影响抽奖结果，但需要记录错误
      }
    }

    // 更新Redis缓存 (在事务成功后)
    if (redisClient && typeof redisClient.setUser === 'function') {
      try {
        const userObjectForCache = user.toJSON();
        userObjectForCache.total_points = finalTotalPoints;
        userObjectForCache.lottery_chances = finalLotteryChances;
        
        await redisClient.setUser(user.id, userObjectForCache);
        logger.info(`用户 ${user_id} 的Redis缓存因抽奖已更新 (积分: ${finalTotalPoints}, 抽奖次数: ${finalLotteryChances})`);
      } catch (redisError) {
        logger.error(`更新用户 ${user_id} 的Redis缓存失败 (抽奖事务后):`, redisError);
      }
    }

    return res.json({
      code: 0,
      message: '抽奖成功',
      data: {
        prizeId: selectedPrize.id,
        actualValue: actualValue,
        displayText: displayText,
        remainingChances: finalLotteryChances,
        transferStatus: (selectedPrize.type === 'money' || selectedPrize.type === 'random_money') ? 'processing' : 'none'
      }
    });
    
  } catch (error) {
    // 如果事务已启动且未提交，则回滚
    if (transaction && transaction.finished !== 'commit' && transaction.finished !== 'rollback') {
        await transaction.rollback();
    }
    logger.error('抽奖失败 (事务处理中):', error);
    return res.json({
      code: 500,
      message: '抽奖失败，请稍后再试',
      data: null
    });
  }
};

/**
 * 🚀 新增：处理现金奖品转账
 * @param {string} userId 用户ID  
 * @param {number} lotteryRecordId 抽奖记录ID
 * @param {number} amount 转账金额
 * @param {string} description 转账描述
 */
const handleCashPrize = async (userId, lotteryRecordId, amount, description) => {
  try {
    logger.info(`开始处理现金奖品转账 - 用户: ${userId}, 金额: ${amount}元`);

    // 验证转账金额
    if (!wechatPayService.validateAmount(amount)) {
      throw new Error(`转账金额超出允许范围: ${amount}元`);
    }

    // 生成商户订单号
    const outTradeNo = wechatPayService.generateOutTradeNo(userId, lotteryRecordId);

    // 创建转账记录
    const { TransferRecord } = require('../models');
    const transferRecord = await TransferRecord.create({
      user_id: userId,
      lottery_record_id: lotteryRecordId,
      transfer_amount: amount,
      out_trade_no: outTradeNo,
      transfer_status: 'pending',
      max_retry_count: 3
    });

    // 将转账任务加入队列
    const queueResult = await transferQueue.addTransferJob({
      transferRecordId: transferRecord.id,
      userId: userId,
      openid: userId, // 假设用户ID就是openid，实际情况可能需要查询
      amount: amount,
      description: description,
      priority: amount >= 10 ? 1 : 0 // 金额大的优先处理
    });

    if (queueResult.success) {
      logger.info(`转账任务已加入队列 - 任务ID: ${queueResult.jobId}, 转账记录ID: ${transferRecord.id}`);
    } else {
      throw new Error(`加入转账队列失败: ${queueResult.error}`);
    }

    return {
      success: true,
      transferRecordId: transferRecord.id,
      jobId: queueResult.jobId
    };

  } catch (error) {
    logger.error(`处理现金奖品转账失败:`, error);
    throw error;
  }
};

/**
 * 记录抽奖结果
 */
const recordResult = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { prizeId, prizeName, prizeType, actualValue } = req.body;
    
    // 这个接口主要是为了兼容前端，实际记录在startLottery中已完成
    return res.json({
      code: 0,
      message: '记录成功',
      data: null
    });
    
  } catch (error) {
    logger.error('记录抽奖结果失败:', error);
    return res.json({
      code: 500,
      message: '记录失败',
      data: null
    });
  }
};

/**
 * 给予抽奖机会（答题完成后调用）
 */
const grantLotteryChance = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { correctCount, isFirstQuiz } = req.body;
    
    logger.info(`抽奖机会判断开始: user_id=${user_id}, correctCount=${correctCount}, isFirstQuiz=${isFirstQuiz}`);
    
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.json({
        code: 404,
        message: '用户不存在',
        data: null
      });
    }

    // 判断是否给予抽奖机会
    // 首次答题或答对6题及以上给予机会
    const shouldGrantChance = isFirstQuiz || correctCount >= 6;
    
    logger.info(`抽奖机会判断结果: shouldGrantChance=${shouldGrantChance}`);
    
    if (shouldGrantChance) {
      // 给予1次抽奖机会
      await User.increment(
        { lottery_chances: 1 }, 
        { where: { id: user_id } }
      );
      
      // 更新Redis缓存
      if (redisClient && typeof redisClient.getUser === 'function' && typeof redisClient.setUser === 'function') {
        try {
          const cachedUser = await redisClient.getUser(user_id);
          if (cachedUser) {
            cachedUser.lottery_chances = (cachedUser.lottery_chances || 0) + 1;
            await redisClient.setUser(user_id, cachedUser);
          }
        } catch (redisError) {
          logger.error(`更新用户 ${user_id} 的Redis缓存失败 (给予抽奖机会后):`, redisError);
        }
      }

      return res.json({
        code: 0,
        message: '已给予抽奖机会',
        data: {
          grantChance: true,
          reason: isFirstQuiz ? '首次答题奖励' : '答对题数达标'
        }
      });
    } else {
      return res.json({
        code: 0,
        message: '未满足抽奖条件',
        data: {
          grantChance: false,
          reason: '答对题数不足6题'
        }
      });
    }
    
  } catch (error) {
    logger.error('给予抽奖机会失败:', error);
    return res.json({
      code: 500,
      message: '操作失败',
      data: null
    });
  }
};

/**
 * 获取抽奖记录
 */
const getRecords = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { page = 1, limit = 10 } = req.query;
    
    const offset = (page - 1) * limit;
    
    const { count, rows } = await LotteryRecord.findAndCountAll({
      where: { user_id },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: offset,
      attributes: [
        'id', 'prize_name', 'prize_type', 'prize_value', 
        'status', 'transfer_status', 'transfer_amount', 'created_at'
      ]
    });
    
    // 🚀 新增：格式化抽奖记录，包含转账状态信息
    const formattedRecords = rows.map(record => {
      const recordData = record.toJSON();
      
      // 添加状态描述
      if (recordData.transfer_status) {
        const statusMap = {
          'none': '无需转账',
          'pending': '待转账',
          'completed': '已到账',
          'failed': '转账失败'
        };
        recordData.transfer_status_text = statusMap[recordData.transfer_status] || '未知状态';
      }
      
      return recordData;
    });
    
    return res.json({
      code: 0,
      message: '获取成功',
      data: {
        records: formattedRecords,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
    
  } catch (error) {
    logger.error('获取抽奖记录失败:', error);
    return res.json({
      code: 500,
      message: '获取失败',
      data: null
    });
  }
};

/**
 * 🚀 新增：查询转账状态
 */
const getTransferStatus = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { lottery_record_id } = req.params;
    
    // 查询抽奖记录
    const lotteryRecord = await LotteryRecord.findOne({
      where: { 
        id: lottery_record_id,
        user_id: user_id 
      }
    });
    
    if (!lotteryRecord) {
      return res.json({
        code: 404,
        message: '抽奖记录不存在',
        data: null
      });
    }
    
    // 查询转账记录
    const { TransferRecord } = require('../models');
    const transferRecord = await TransferRecord.findOne({
      where: { lottery_record_id: lottery_record_id },
      order: [['created_at', 'DESC']]
    });
    
    let transferInfo = {
      status: lotteryRecord.transfer_status || 'none',
      amount: lotteryRecord.transfer_amount,
      created_at: lotteryRecord.created_at
    };
    
    if (transferRecord) {
      transferInfo = {
        ...transferInfo,
        transfer_id: transferRecord.id,
        out_trade_no: transferRecord.out_trade_no,
        transfer_status: transferRecord.transfer_status,
        failure_reason: transferRecord.failure_reason,
        retry_count: transferRecord.retry_count,
        transfer_time: transferRecord.transfer_time
      };
    }
    
    return res.json({
      code: 0,
      message: '查询成功',
      data: transferInfo
    });
    
  } catch (error) {
    logger.error('查询转账状态失败:', error);
    return res.json({
      code: 500,
      message: '查询失败',
      data: null
    });
  }
};

module.exports = {
  startLottery,
  recordResult,
  grantLotteryChance,
  getRecords,
  getTransferStatus,
  handleCashPrize
}; 