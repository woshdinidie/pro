const WxPay = require('wechatpay-node-v3');
const fs = require('fs');
const crypto = require('crypto');
const config = require('../config/wechat-pay');
const logger = require('./logger');

class WechatPayService {
  constructor() {
    this.wxpay = null;
    this.isInitialized = false;
    this.init();
  }

  /**
   * 初始化微信支付实例
   */
  init() {
    try {
      const { wechatPay } = config;
      
      // 检查是否在开发环境且缺少必要配置
      if (process.env.NODE_ENV !== 'production') {
        // 检查环境变量
        if (!wechatPay.appid || !wechatPay.mchid || !wechatPay.apikey) {
          logger.warn('微信支付配置不完整，开发模式下跳过初始化。请参考 TRANSFER_SETUP_GUIDE.md 完成配置');
          return;
        }
        
        // 检查证书文件
        if (!fs.existsSync(wechatPay.certPath.privateKey) || !fs.existsSync(wechatPay.certPath.certificate)) {
          logger.warn('微信支付证书文件缺失，开发模式下跳过初始化。请按照指南放置证书文件');
          return;
        }
      }
      
      // 读取证书文件
      const privateKey = fs.readFileSync(wechatPay.certPath.privateKey);
      const certificate = fs.readFileSync(wechatPay.certPath.certificate);
      
      this.wxpay = new WxPay({
        appid: wechatPay.appid,
        mchid: wechatPay.mchid,
        publicKey: certificate,
        privateKey: privateKey,
        key: wechatPay.apikey,
      });
      
      this.isInitialized = true;
      logger.info('微信支付服务初始化成功');
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        logger.error('微信支付服务初始化失败:', error);
        throw error;
      } else {
        logger.warn('微信支付服务初始化失败（开发模式）:', error.message);
        logger.warn('请参考 TRANSFER_SETUP_GUIDE.md 完成配置后重启服务');
      }
    }
  }

  /**
   * 检查服务是否已初始化
   */
  checkInitialized() {
    // 🚀 开发模式下允许跳过初始化检查
    if (process.env.NODE_ENV === 'development' && process.env.WECHAT_DEV_MODE === 'true') {
      logger.info('[开发模式] 跳过微信支付服务初始化检查');
      return;
    }
    
    if (!this.isInitialized) {
      throw new Error('微信支付服务未初始化，请检查配置');
    }
  }

  /**
   * 生成商户订单号
   * @param {string} userId 用户ID
   * @param {number} lotteryId 抽奖记录ID
   * @returns {string} 订单号
   */
  generateOutTradeNo(userId, lotteryId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `TRF_${userId.substring(0, 8)}_${lotteryId}_${timestamp}_${random}`;
  }

  /**
   * 验证转账金额
   * @param {number} amount 转账金额(元)
   * @returns {boolean} 是否有效
   */
  validateAmount(amount) {
    const { minAmount, maxAmount } = config.wechatPay.transfer;
    return amount >= minAmount && amount <= maxAmount;
  }

  /**
   * 商家转账到零钱
   * @param {Object} transferData 转账数据
   * @returns {Object} 转账结果
   */
  async transferToBalance(transferData) {
    try {
      // 🚀 新增：调试日志 - 检查环境变量
      logger.info(`[调试] 环境变量检查: NODE_ENV=${process.env.NODE_ENV}, WECHAT_DEV_MODE=${process.env.WECHAT_DEV_MODE}`);
      
      this.checkInitialized();
      
      const { userId, openid, amount, outTradeNo, description } = transferData;
      
      // 🚀 开发模式：模拟转账成功
      if (process.env.NODE_ENV === 'development' && process.env.WECHAT_DEV_MODE === 'true') {
        logger.info(`[开发模式] 模拟转账处理: 用户${userId}, 金额${amount}元, 订单号${outTradeNo}`);
        
        // 模拟处理延迟
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockResult = {
          success: true,
          data: {
            out_batch_no: outTradeNo,
            batch_id: `DEV_BATCH_${Date.now()}`,
            batch_status: 'ACCEPTED',
            create_time: new Date().toISOString()
          },
          batchId: `DEV_BATCH_${Date.now()}`,
          outTradeNo: outTradeNo
        };
        
        logger.info(`[开发模式] 模拟转账成功: ${JSON.stringify(mockResult)}`);
        return mockResult;
      }
      
      logger.info(`[调试] 未进入开发模式分支，继续真实转账流程`);
      
      // 验证金额
      if (!this.validateAmount(amount)) {
        throw new Error(`转账金额不在允许范围内: ${amount}元`);
      }

      // 构建转账请求参数
      const params = {
        appid: config.wechatPay.appid,
        out_batch_no: outTradeNo, // 商户批次单号
        batch_name: description || config.wechatPay.transfer.desc,
        batch_remark: `用户${userId}答题奖励`,
        total_amount: Math.round(amount * 100), // 转换为分
        total_num: 1, // 转账笔数
        transfer_detail_list: [
          {
            out_detail_no: `${outTradeNo}_001`, // 商户明细单号
            transfer_amount: Math.round(amount * 100), // 转账金额(分)
            transfer_remark: description || '答题奖励',
            openid: openid, // 用户openid
            user_name: '' // 收款用户姓名(可选)
          }
        ]
      };

      logger.info(`发起转账请求:`, {
        userId,
        amount,
        outTradeNo,
        params: JSON.stringify(params)
      });

      // 调用微信转账API
      const result = await this.wxpay.v3.transfer.batches.post(params);
      
      logger.info(`转账请求响应:`, {
        userId,
        outTradeNo,
        result: JSON.stringify(result)
      });

      return {
        success: true,
        data: result,
        batchId: result.batch_id,
        outTradeNo: outTradeNo
      };

    } catch (error) {
      logger.error(`转账失败:`, {
        userId: transferData.userId,
        amount: transferData.amount,
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message,
        errorCode: error.code || 'TRANSFER_ERROR'
      };
    }
  }

  /**
   * 查询转账结果
   * @param {string} batchId 微信批次单号
   * @param {string} outTradeNo 商户订单号
   * @returns {Object} 查询结果
   */
  async queryTransfer(batchId, outTradeNo) {
    try {
      this.checkInitialized();
      
      // 查询批次单信息
      const batchResult = await this.wxpay.v3.transfer.batches[batchId].get();
      
      // 查询明细单信息
      const detailResult = await this.wxpay.v3.transfer.batches[batchId].details[`${outTradeNo}_001`].get();

      return {
        success: true,
        batchInfo: batchResult,
        detailInfo: detailResult,
        transferStatus: detailResult.detail_status // SUCCESS, PROCESSING, FAIL
      };

    } catch (error) {
      logger.error(`查询转账失败:`, {
        batchId,
        outTradeNo,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 验证回调签名
   * @param {Object} headers 请求头
   * @param {string} body 请求体
   * @returns {boolean} 验证结果
   */
  verifyNotifySignature(headers, body) {
    try {
      const signature = headers['wechatpay-signature'];
      const timestamp = headers['wechatpay-timestamp'];
      const nonce = headers['wechatpay-nonce'];
      const serial = headers['wechatpay-serial'];

      // 构建验签字符串
      const message = `${timestamp}\n${nonce}\n${body}\n`;
      
      // 使用微信支付平台公钥验证签名
      // 这里需要实现具体的验签逻辑
      // 实际使用时，应该使用微信支付平台证书进行验证
      
      return true; // 临时返回true，实际需要实现验签
    } catch (error) {
      logger.error('验证回调签名失败:', error);
      return false;
    }
  }

  /**
   * 处理转账回调通知
   * @param {Object} notifyData 回调数据
   * @returns {Object} 处理结果
   */
  async handleTransferNotify(notifyData) {
    try {
      const { resource } = notifyData;
      
      // 解密回调数据
      const decryptedData = this.decryptNotifyResource(resource);
      
      logger.info('转账回调通知:', decryptedData);

      return {
        success: true,
        data: decryptedData
      };
    } catch (error) {
      logger.error('处理转账回调失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 解密回调资源
   * @param {Object} resource 加密资源
   * @returns {Object} 解密后的数据
   */
  decryptNotifyResource(resource) {
    try {
      const { algorithm, ciphertext, associated_data, nonce } = resource;
      
      // AES-256-GCM解密
      const key = config.wechatPay.apikey;
      const decipher = crypto.createDecipherGCM('aes-256-gcm', Buffer.from(key));
      
      decipher.setAuthTag(Buffer.from(ciphertext.slice(-32), 'base64'));
      decipher.setAAD(Buffer.from(associated_data));
      
      let decrypted = decipher.update(
        Buffer.from(ciphertext.slice(0, -32), 'base64'),
        null,
        'utf8'
      );
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('解密回调数据失败:', error);
      throw error;
    }
  }
}

module.exports = new WechatPayService(); 