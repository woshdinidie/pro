const fs = require('fs');
const path = require('path');

module.exports = {
  // 微信支付配置
  wechatPay: {
    // 基础配置
    appid: process.env.WECHAT_APPID || '', // 小程序appid
    mchid: process.env.WECHAT_MCHID || '', // 商户号
    
    // API密钥
    apikey: process.env.WECHAT_APIKEY || '', // 商户APIv3密钥
    
    // 证书路径
    certPath: {
      // 商户私钥证书
      privateKey: path.join(__dirname, '../certs/apiclient_key.pem'),
      // 商户证书
      certificate: path.join(__dirname, '../certs/apiclient_cert.pem'),
      // 微信支付平台证书(可选，自动下载)
      platformCert: path.join(__dirname, '../certs/wechatpay_cert.pem')
    },
    
    // 商家转账配置
    transfer: {
      // 转账描述
      desc: '答题奖励',
      // 最小转账金额(元)
      minAmount: 0.01,
      // 最大转账金额(元)  
      maxAmount: 200.00,
      // 每日最大转账次数
      dailyMaxCount: 1000,
      // 转账超时时间(秒)
      timeout: 30
    },
    
    // 环境配置
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
    
    // API端点
    apiEndpoints: {
      transfer: 'https://api.mch.weixin.qq.com/v3/transfer/batches',
      queryTransfer: 'https://api.mch.weixin.qq.com/v3/transfer/batches/batch-id/{batch_id}',
      queryDetail: 'https://api.mch.weixin.qq.com/v3/transfer/batches/batch-id/{batch_id}/details/detail-id/{detail_id}'
    }
  },
  
  // 队列配置
  queue: {
    // Redis配置(复用现有Redis)
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || '',
      db: process.env.REDIS_TRANSFER_DB || 2 // 使用独立的数据库
    },
    
    // 队列设置
    settings: {
      // 并发处理数
      concurrency: 5,
      // 任务超时时间(毫秒)
      jobTimeout: 60000,
      // 失败重试次数
      maxRetries: 3,
      // 重试延迟(毫秒)
      retryDelay: 5000,
      // 队列名称
      queueName: 'transfer-queue'
    }
  },
  
  // 安全配置
  security: {
    // 签名算法
    signType: 'WECHATPAY2-SHA256-RSA2048',
    // 请求超时时间(毫秒)
    timeout: 30000,
    // 是否验证微信支付平台证书
    verifyCert: true
  },
  
  // 日志配置
  logging: {
    // 是否记录详细日志
    verbose: process.env.NODE_ENV !== 'production',
    // 是否记录敏感信息(生产环境应关闭)
    logSensitive: false
  }
};

// 验证配置完整性
function validateConfig() {
  const config = module.exports;
  const required = [
    'wechatPay.appid',
    'wechatPay.mchid', 
    'wechatPay.apikey'
  ];
  
  for (const key of required) {
    const value = key.split('.').reduce((obj, k) => obj && obj[k], config);
    if (!value) {
      throw new Error(`Missing required configuration: ${key}`);
    }
  }
  
  // 检查证书文件是否存在
  const certFiles = Object.values(config.wechatPay.certPath);
  for (const certFile of certFiles) {
    if (certFile.includes('apiclient') && !fs.existsSync(certFile)) {
      console.warn(`Certificate file not found: ${certFile}`);
    }
  }
}

// 开发环境下验证配置
if (process.env.NODE_ENV !== 'test') {
  try {
    validateConfig();
  } catch (error) {
    console.warn('WeChat Pay configuration validation failed:', error.message);
  }
} 