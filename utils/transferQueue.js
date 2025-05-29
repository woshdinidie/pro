const Queue = require('bull');
const config = require('../config/wechat-pay');
const wechatPayService = require('./wechatPayService');
const logger = require('./logger');
const { TransferRecord, TransferLog, User } = require('../models');
const { Op } = require('sequelize');

class TransferQueue {
  constructor() {
    this.queue = null;
    this.init();
  }

  /**
   * 初始化队列
   */
  init() {
    try {
      const queueConfig = config.queue;
      
      // 🚀 开发模式下允许队列初始化，即使微信支付服务未初始化
      const isDevMode = process.env.NODE_ENV === 'development' && process.env.WECHAT_DEV_MODE === 'true';
      
      // 检查微信支付服务是否可用
      if (!wechatPayService.isInitialized && !isDevMode) {
        logger.warn('微信支付服务未初始化，转账队列将跳过初始化');
        return;
      }
      
      if (isDevMode && !wechatPayService.isInitialized) {
        logger.info('[开发模式] 微信支付服务未初始化，但队列将正常启动进行模拟转账');
      }
      
      // 创建队列实例
      this.queue = new Queue(queueConfig.settings.queueName, {
        redis: queueConfig.redis,
        defaultJobOptions: {
          removeOnComplete: 50, // 保留最近50个完成的任务
          removeOnFail: 100,    // 保留最近100个失败的任务
          attempts: queueConfig.settings.maxRetries,
          backoff: {
            type: 'exponential',
            delay: queueConfig.settings.retryDelay
          },
          timeout: queueConfig.settings.jobTimeout
        }
      });

      // 设置队列处理器
      this.queue.process(queueConfig.settings.concurrency, this.processTransfer.bind(this));

      // 队列事件监听
      this.setupEventListeners();

      if (isDevMode) {
        logger.info('转账队列服务初始化成功 [开发模式 - 模拟转账]');
      } else {
        logger.info('转账队列服务初始化成功');
      }
    } catch (error) {
      logger.error('转账队列服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    this.queue.on('completed', (job, result) => {
      logger.info(`转账任务完成: ${job.id}`, { result });
    });

    this.queue.on('failed', (job, err) => {
      logger.error(`转账任务失败: ${job.id}`, { error: err.message });
    });

    this.queue.on('stalled', (job) => {
      logger.warn(`转账任务停滞: ${job.id}`);
    });

    this.queue.on('progress', (job, progress) => {
      logger.info(`转账任务进度: ${job.id} - ${progress}%`);
    });
  }

  /**
   * 添加转账任务到队列
   * @param {Object} transferData 转账数据
   * @param {Object} options 队列选项
   * @returns {Object} 任务信息
   */
  async addTransferJob(transferData, options = {}) {
    try {
      const {
        transferRecordId,
        userId,
        openid,
        amount,
        description,
        priority = 0,
        delay = 0
      } = transferData;

      const jobData = {
        transferRecordId,
        userId,
        openid,
        amount,
        description,
        timestamp: Date.now()
      };

      const jobOptions = {
        priority,
        delay,
        ...options
      };

      const job = await this.queue.add('transfer', jobData, jobOptions);
      
      logger.info(`转账任务已添加到队列: ${job.id}`, jobData);
      
      return {
        success: true,
        jobId: job.id,
        data: jobData
      };
    } catch (error) {
      logger.error('添加转账任务失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 处理转账任务
   * @param {Object} job 队列任务
   * @returns {Object} 处理结果
   */
  async processTransfer(job) {
    // 🚀 强制日志：确保方法被调用
    console.log('🔥 processTransfer方法被调用！', {
      jobId: job.id,
      jobData: job.data,
      timestamp: new Date().toISOString()
    });
    logger.error('🔥 processTransfer方法被调用！', {
      jobId: job.id,
      jobData: job.data,
      timestamp: new Date().toISOString()
    });

    const { transferRecordId, userId, openid, amount, description } = job.data;
    
    try {
      logger.info(`开始处理转账任务: ${job.id}`, job.data);
      
      // 更新任务进度
      job.progress(10);

      // 获取转账记录
      const transferRecord = await TransferRecord.findByPk(transferRecordId);
      if (!transferRecord) {
        throw new Error(`转账记录不存在: ${transferRecordId}`);
      }

      // 检查转账状态
      if (transferRecord.transfer_status === 'success') {
        logger.info(`转账已完成，跳过处理: ${transferRecordId}`);
        return { status: 'already_completed' };
      }

      // 更新状态为处理中
      await this.updateTransferStatus(transferRecordId, 'processing', '开始处理转账');
      job.progress(20);

      // 🚀 新增：详细的转账前日志
      logger.info(`准备调用微信转账服务`, {
        transferRecordId,
        userId,
        amount,
        outTradeNo: transferRecord.out_trade_no,
        NODE_ENV: process.env.NODE_ENV,
        WECHAT_DEV_MODE: process.env.WECHAT_DEV_MODE
      });

      // 执行微信转账
      const transferResult = await wechatPayService.transferToBalance({
        userId,
        openid,
        amount,
        outTradeNo: transferRecord.out_trade_no,
        description
      });

      // 🚀 新增：转账结果详细日志
      logger.info(`微信转账服务返回结果`, {
        transferRecordId,
        transferResult: JSON.stringify(transferResult)
      });

      job.progress(60);

      if (transferResult.success) {
        // 转账成功
        await this.handleTransferSuccess(transferRecord, transferResult);
        job.progress(100);
        
        return {
          status: 'success',
          batchId: transferResult.batchId,
          amount
        };
      } else {
        // 转账失败
        logger.error(`转账服务返回失败`, {
          transferRecordId,
          error: transferResult.error,
          errorCode: transferResult.errorCode
        });
        await this.handleTransferFailure(transferRecord, transferResult.error);
        throw new Error(transferResult.error);
      }

    } catch (error) {
      logger.error(`转账任务处理失败: ${job.id}`, {
        transferRecordId,
        error: error.message,
        stack: error.stack,
        errorType: error.constructor.name
      });

      // 记录失败日志
      await this.logTransferAction(transferRecordId, 'TRANSFER_FAILED', null, null, error.message);
      
      throw error;
    }
  }

  /**
   * 处理转账成功
   * @param {Object} transferRecord 转账记录
   * @param {Object} transferResult 转账结果
   */
  async handleTransferSuccess(transferRecord, transferResult) {
    try {
      // 更新转账记录
      await transferRecord.update({
        transfer_status: 'success',
        partner_trade_no: transferResult.batchId,
        transfer_time: new Date(),
        wechat_response: JSON.stringify(transferResult.data)
      });

      // 更新抽奖记录的转账状态
      await this.updateLotteryRecordTransferStatus(transferRecord.lottery_record_id, 'completed');

      // 记录成功日志
      await this.logTransferAction(
        transferRecord.id, 
        'TRANSFER_SUCCESS', 
        'processing', 
        'success',
        `转账成功，微信批次号: ${transferResult.batchId}`
      );

      logger.info(`转账成功: ${transferRecord.id}`, {
        amount: transferRecord.transfer_amount,
        batchId: transferResult.batchId
      });

    } catch (error) {
      logger.error(`处理转账成功状态失败: ${transferRecord.id}`, error);
      throw error;
    }
  }

  /**
   * 处理转账失败
   * @param {Object} transferRecord 转账记录
   * @param {string} errorMessage 错误信息
   */
  async handleTransferFailure(transferRecord, errorMessage) {
    try {
      const retryCount = transferRecord.retry_count + 1;
      const maxRetries = transferRecord.max_retry_count;

      if (retryCount < maxRetries) {
        // 计算下次重试时间
        const nextRetryTime = new Date(Date.now() + Math.pow(2, retryCount) * 60000); // 指数退避

        await transferRecord.update({
          transfer_status: 'retry',
          failure_reason: errorMessage,
          retry_count: retryCount,
          next_retry_time: nextRetryTime
        });

        // 记录重试日志
        await this.logTransferAction(
          transferRecord.id,
          'TRANSFER_RETRY',
          'processing',
          'retry',
          `转账失败，准备第${retryCount}次重试: ${errorMessage}`
        );

        // 添加重试任务
        await this.addTransferJob({
          transferRecordId: transferRecord.id,
          userId: transferRecord.user_id,
          openid: await this.getUserOpenid(transferRecord.user_id),
          amount: parseFloat(transferRecord.transfer_amount),
          description: '答题奖励-重试'
        }, {
          delay: nextRetryTime.getTime() - Date.now(),
          priority: 1 // 重试任务优先级较高
        });

      } else {
        // 超过最大重试次数，标记为最终失败
        await transferRecord.update({
          transfer_status: 'failed',
          failure_reason: errorMessage,
          retry_count: retryCount
        });

        // 更新抽奖记录状态
        await this.updateLotteryRecordTransferStatus(transferRecord.lottery_record_id, 'failed');

        // 记录最终失败日志
        await this.logTransferAction(
          transferRecord.id,
          'TRANSFER_FINAL_FAILED',
          'retry',
          'failed',
          `转账最终失败，已达最大重试次数: ${errorMessage}`
        );
      }

    } catch (error) {
      logger.error(`处理转账失败状态失败: ${transferRecord.id}`, error);
      throw error;
    }
  }

  /**
   * 更新转账状态
   * @param {number} transferRecordId 转账记录ID
   * @param {string} status 新状态
   * @param {string} message 状态信息
   */
  async updateTransferStatus(transferRecordId, status, message) {
    try {
      const transferRecord = await TransferRecord.findByPk(transferRecordId);
      if (!transferRecord) {
        throw new Error(`转账记录不存在: ${transferRecordId}`);
      }

      const oldStatus = transferRecord.transfer_status;
      await transferRecord.update({ transfer_status: status });

      // 记录状态变更日志
      await this.logTransferAction(transferRecordId, 'STATUS_UPDATE', oldStatus, status, message);

    } catch (error) {
      logger.error(`更新转账状态失败: ${transferRecordId}`, error);
      throw error;
    }
  }

  /**
   * 更新抽奖记录的转账状态
   * @param {number} lotteryRecordId 抽奖记录ID
   * @param {string} status 转账状态
   */
  async updateLotteryRecordTransferStatus(lotteryRecordId, status) {
    try {
      const { LotteryRecord } = require('../models');
      await LotteryRecord.update(
        { transfer_status: status },
        { where: { id: lotteryRecordId } }
      );
    } catch (error) {
      logger.error(`更新抽奖记录转账状态失败: ${lotteryRecordId}`, error);
    }
  }

  /**
   * 记录转账操作日志
   */
  async logTransferAction(transferRecordId, action, statusBefore, statusAfter, message, operator = 'system') {
    try {
      await TransferLog.create({
        transfer_record_id: transferRecordId,
        action,
        status_before: statusBefore,
        status_after: statusAfter,
        message,
        operator
      });
    } catch (error) {
      logger.error(`记录转账日志失败: ${transferRecordId}`, error);
    }
  }

  /**
   * 获取用户openid
   * @param {string} userId 用户ID
   * @returns {string} openid
   */
  async getUserOpenid(userId) {
    try {
      const user = await User.findByPk(userId);
      return user ? user.id : userId; // 假设用户ID就是openid
    } catch (error) {
      logger.error(`获取用户openid失败: ${userId}`, error);
      return userId;
    }
  }

  /**
   * 获取队列统计信息
   * @returns {Object} 统计信息
   */
  async getQueueStats() {
    try {
      const waiting = await this.queue.waiting();
      const active = await this.queue.active();
      const completed = await this.queue.completed();
      const failed = await this.queue.failed();

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total: waiting.length + active.length + completed.length + failed.length
      };
    } catch (error) {
      logger.error('获取队列统计信息失败:', error);
      return null;
    }
  }

  /**
   * 清理过期任务
   */
  async cleanupJobs() {
    try {
      await this.queue.clean(24 * 60 * 60 * 1000, 'completed'); // 清理24小时前的完成任务
      await this.queue.clean(7 * 24 * 60 * 60 * 1000, 'failed'); // 清理7天前的失败任务
      logger.info('队列清理完成');
    } catch (error) {
      logger.error('队列清理失败:', error);
    }
  }
}

module.exports = new TransferQueue();