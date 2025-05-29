const Prize = require('../models/prize');
const User = require('../models/user');
const LotteryRecord = require('../models/lotteryRecord');
const { Op } = require('sequelize');

// 获取奖品列表
exports.getPrizes = async (req, res) => {
  try {
    const prizes = await Prize.findAll({
      where: {
        status: 1
      },
      order: [['probability', 'ASC']]
    });
    
    res.json({
      code: 0,
      data: prizes
    });
  } catch (error) {
    console.error('获取奖品列表失败:', error);
    res.status(500).json({
      code: 500,
      msg: '获取奖品列表失败'
    });
  }
};

// 开始抽奖
exports.startLottery = async (req, res) => {
  const userId = req.user.id;
  
  try {
    // 检查用户积分
    const user = await User.findByPk(userId);
    if (!user || user.total_points < 10) {
      return res.json({
        code: 400,
        msg: '积分不足，抽奖需要10积分'
      });
    }
    
    // 获取所有可用奖品
    const prizes = await Prize.findAll({
      where: {
        status: 1
      }
    });
    
    if (prizes.length === 0) {
      return res.json({
        code: 400,
        msg: '暂无可用奖品'
      });
    }
    
    // 根据概率随机选择奖品
    const random = Math.random() * 100;
    let probabilitySum = 0;
    let selectedPrize = null;
    
    for (const prize of prizes) {
      probabilitySum += prize.probability;
      if (random <= probabilitySum) {
        selectedPrize = prize;
        break;
      }
    }
    
    // 如果没有选中奖品（理论上不会发生），选择第一个奖品
    if (!selectedPrize) {
      selectedPrize = prizes[0];
    }
    
    // 扣除用户积分
    await user.update({
      total_points: user.total_points - 10
    });
    
    // 发放奖品
    if (selectedPrize.type === 1) { // 现金红包
      await user.update({
        total_points: user.total_points + selectedPrize.value
      });
    } else if (selectedPrize.type === 2) { // 积分奖励
      await user.update({
        total_points: user.total_points + selectedPrize.value
      });
    }
    
    // 记录抽奖记录
    await LotteryRecord.create({
      user_id: userId,
      prize_id: selectedPrize.id,
      points_cost: 10,
      points_earned: selectedPrize.type === 2 ? selectedPrize.value : 0,
      cash_earned: selectedPrize.type === 1 ? selectedPrize.value : 0
    });
    
    res.json({
      code: 0,
      data: {
        prize: selectedPrize,
        points: user.total_points
      }
    });
  } catch (error) {
    console.error('抽奖失败:', error);
    res.status(500).json({
      code: 500,
      msg: '抽奖失败'
    });
  }
};

// 获取抽奖记录
exports.getLotteryRecords = async (req, res) => {
  const userId = req.user.id;
  const { page = 1, pageSize = 10 } = req.query;
  
  try {
    const { count, rows } = await LotteryRecord.findAndCountAll({
      where: {
        user_id: userId
      },
      include: [{
        model: Prize,
        attributes: ['name', 'image', 'type']
      }],
      order: [['created_at', 'DESC']],
      offset: (page - 1) * pageSize,
      limit: parseInt(pageSize)
    });
    
    res.json({
      code: 0,
      data: {
        total: count,
        records: rows
      }
    });
  } catch (error) {
    console.error('获取抽奖记录失败:', error);
    res.status(500).json({
      code: 500,
      msg: '获取抽奖记录失败'
    });
  }
}; 