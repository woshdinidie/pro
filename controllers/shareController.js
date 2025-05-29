const { ShareRecord, User } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

// 记录分享并检查是否可以获得额外答题机会
exports.recordShare = async (req, res) => {
  try {
    const { user_id } = req.user;
    const today = new Date().toISOString().split('T')[0];

    // 检查今日是否已经分享过
    const existingShare = await ShareRecord.findOne({
      where: {
        user_id,
        share_date: today,
        share_type: 1
      }
    });

    if (existingShare) {
      return res.json({
        code: 400,
        message: '今日已获得分享奖励',
        data: null
      });
    }

    // 记录分享
    await ShareRecord.create({
      user_id,
      share_date: today,
      share_type: 1
    });

    // 更新用户答题次数
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.json({
        code: 404,
        message: '用户不存在',
        data: null
      });
    }

    // 这里可以添加更新用户答题次数的逻辑
    // 具体实现取决于您如何存储用户的答题次数

    return res.json({
      code: 0,
      message: '分享成功，获得1次额外答题机会',
      data: {
        extra_chance: true
      }
    });
  } catch (error) {
    logger.error('记录分享失败:', error);
    return res.json({
      code: 500,
      message: '服务器错误',
      data: null
    });
  }
};

// 获取用户分享记录
exports.getShareRecords = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { page = 1, pageSize = 10 } = req.query;

    const records = await ShareRecord.findAndCountAll({
      where: { user_id },
      order: [['created_at', 'DESC']],
      limit: parseInt(pageSize),
      offset: (parseInt(page) - 1) * parseInt(pageSize)
    });

    return res.json({
      code: 0,
      message: '获取成功',
      data: {
        total: records.count,
        list: records.rows,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    logger.error('获取分享记录失败:', error);
    return res.json({
      code: 500,
      message: '服务器错误',
      data: null
    });
  }
}; 