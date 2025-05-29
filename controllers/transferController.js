const { TransferRecord, TransferLog, User, LotteryRecord, sequelize } = require('../models');
const logger = require('../utils/logger');
const wechatPayService = require('../utils/wechatPayService');
const transferQueue = require('../utils/transferQueue');
const { Op } = require('sequelize');

/**
 * 处理微信支付转账回调通知
 */
const handleWechatNotify = async (req, res) => {
  try {
    logger.info('收到微信转账回调通知', {
      headers: req.headers,
      body: req.body
    });

    // 验证签名
    const isValidSignature = wechatPayService.verifyNotifySignature(req.headers, JSON.stringify(req.body));
    if (!isValidSignature) {
      logger.error('微信回调签名验证失败');
      return res.status(400).json({ code: 'FAIL', message: '签名验证失败' });
    }

    // 处理回调数据
    const result = await wechatPayService.handleTransferNotify(req.body);
    if (!result.success) {
      logger.error('处理微信回调数据失败:', result.error);
      return res.status(500).json({ code: 'FAIL', message: '处理回调数据失败' });
    }

    const { event_type, resource } = req.body;
    const transferData = result.data;

    // 根据事件类型处理
    if (event_type === 'TRANSFER.SUCCESS') {
      await handleTransferSuccessNotify(transferData);
    } else if (event_type === 'TRANSFER.CLOSED') {
      await handleTransferFailureNotify(transferData);
    }

    // 返回成功响应
    res.json({ code: 'SUCCESS', message: '处理成功' });

  } catch (error) {
    logger.error('处理微信转账回调失败:', error);
    res.status(500).json({ code: 'FAIL', message: '处理失败' });
  }
};

/**
 * 处理转账成功回调
 */
const handleTransferSuccessNotify = async (transferData) => {
  try {
    const { out_batch_no, batch_id } = transferData;
    
    // 查找转账记录
    const transferRecord = await TransferRecord.findOne({
      where: { out_trade_no: out_batch_no }
    });

    if (!transferRecord) {
      logger.warn(`未找到转账记录: ${out_batch_no}`);
      return;
    }

    // 更新转账记录状态
    await transferRecord.update({
      transfer_status: 'success',
      partner_trade_no: batch_id,
      transfer_time: new Date(),
      wechat_response: JSON.stringify(transferData)
    });

    // 更新抽奖记录状态
    await LotteryRecord.update(
      { transfer_status: 'completed' },
      { where: { id: transferRecord.lottery_record_id } }
    );

    // 记录日志
    await TransferLog.create({
      transfer_record_id: transferRecord.id,
      action: 'WECHAT_CALLBACK_SUCCESS',
      status_before: 'processing',
      status_after: 'success',
      message: `微信回调通知转账成功，批次号: ${batch_id}`,
      operator: 'wechat'
    });

    logger.info(`转账成功回调处理完成: ${transferRecord.id}`);

  } catch (error) {
    logger.error('处理转账成功回调失败:', error);
    throw error;
  }
};

/**
 * 处理转账失败回调
 */
const handleTransferFailureNotify = async (transferData) => {
  try {
    const { out_batch_no, batch_id, close_reason } = transferData;
    
    // 查找转账记录
    const transferRecord = await TransferRecord.findOne({
      where: { out_trade_no: out_batch_no }
    });

    if (!transferRecord) {
      logger.warn(`未找到转账记录: ${out_batch_no}`);
      return;
    }

    // 更新转账记录状态
    await transferRecord.update({
      transfer_status: 'failed',
      partner_trade_no: batch_id,
      failure_reason: close_reason,
      wechat_response: JSON.stringify(transferData)
    });

    // 更新抽奖记录状态
    await LotteryRecord.update(
      { transfer_status: 'failed' },
      { where: { id: transferRecord.lottery_record_id } }
    );

    // 记录日志
    await TransferLog.create({
      transfer_record_id: transferRecord.id,
      action: 'WECHAT_CALLBACK_FAILED',
      status_before: 'processing',
      status_after: 'failed',
      message: `微信回调通知转账失败，原因: ${close_reason}`,
      operator: 'wechat'
    });

    logger.warn(`转账失败回调处理完成: ${transferRecord.id}, 失败原因: ${close_reason}`);

  } catch (error) {
    logger.error('处理转账失败回调失败:', error);
    throw error;
  }
};

/**
 * 获取用户转账记录
 */
const getTransferRecords = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { page = 1, limit = 10, status } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = { user_id };
    
    if (status) {
      whereClause.transfer_status = status;
    }
    
    const { count, rows } = await TransferRecord.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: offset,
      include: [
        {
          model: LotteryRecord,
          as: 'lotteryRecord',
          attributes: ['prize_name', 'prize_type']
        }
      ]
    });
    
    return res.json({
      code: 0,
      message: '获取成功',
      data: {
        records: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
    
  } catch (error) {
    logger.error('获取转账记录失败:', error);
    return res.json({
      code: 500,
      message: '获取失败',
      data: null
    });
  }
};

/**
 * 重试失败的转账
 */
const retryTransfer = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { transfer_id } = req.params;
    
    // 查找转账记录
    const transferRecord = await TransferRecord.findOne({
      where: { 
        id: transfer_id,
        user_id: user_id,
        transfer_status: 'failed'
      }
    });
    
    if (!transferRecord) {
      return res.json({
        code: 404,
        message: '转账记录不存在或状态不允许重试',
        data: null
      });
    }
    
    // 检查重试次数
    if (transferRecord.retry_count >= transferRecord.max_retry_count) {
      return res.json({
        code: 400,
        message: '已达到最大重试次数',
        data: null
      });
    }
    
    // 重置状态并加入队列
    await transferRecord.update({
      transfer_status: 'pending',
      failure_reason: null
    });
    
    // 添加到转账队列
    const queueResult = await transferQueue.addTransferJob({
      transferRecordId: transferRecord.id,
      userId: transferRecord.user_id,
      openid: transferRecord.user_id,
      amount: parseFloat(transferRecord.transfer_amount),
      description: '手动重试转账',
      priority: 2 // 手动重试优先级最高
    });
    
    if (queueResult.success) {
      // 记录重试日志
      await TransferLog.create({
        transfer_record_id: transferRecord.id,
        action: 'MANUAL_RETRY',
        status_before: 'failed',
        status_after: 'pending',
        message: '用户手动重试转账',
        operator: user_id
      });
      
      return res.json({
        code: 0,
        message: '重试任务已提交',
        data: {
          jobId: queueResult.jobId
        }
      });
    } else {
      return res.json({
        code: 500,
        message: '提交重试任务失败',
        data: null
      });
    }
    
  } catch (error) {
    logger.error('重试转账失败:', error);
    return res.json({
      code: 500,
      message: '重试失败',
      data: null
    });
  }
};

/**
 * 获取转账统计信息（管理员接口）
 */
const getTransferStats = async (req, res) => {
  try {
    // 这里可以添加管理员权限验证
    
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    
    if (startDate && endDate) {
      dateFilter.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    // 统计各状态的转账数量和金额
    const statusStats = await TransferRecord.findAll({
      where: dateFilter,
      attributes: [
        'transfer_status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('transfer_amount')), 'total_amount']
      ],
      group: 'transfer_status'
    });
    
    // 获取队列统计
    const queueStats = await transferQueue.getQueueStats();
    
    // 今日转账统计
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStats = await TransferRecord.findAll({
      where: {
        created_at: { [Op.gte]: today }
      },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('transfer_amount')), 'total_amount']
      ]
    });
    
    return res.json({
      code: 0,
      message: '获取成功',
      data: {
        statusStats,
        queueStats,
        todayStats: todayStats[0] || { count: 0, total_amount: 0 }
      }
    });
    
  } catch (error) {
    logger.error('获取转账统计失败:', error);
    return res.json({
      code: 500,
      message: '获取失败',
      data: null
    });
  }
};

module.exports = {
  handleWechatNotify,
  getTransferRecords,
  retryTransfer,
  getTransferStats
};