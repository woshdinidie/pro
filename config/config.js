module.exports = {
  wechat: {
    // 微信小程序 appId - 在微信公众平台(https://mp.weixin.qq.com)申请小程序后获取
    // 测试环境可以使用测试号，生产环境需要正式appId
    appId: 'wxca55de6d71adfecf',
    // 微信小程序 appSecret - 在小程序后台的开发设置中获取
    appSecret: '269922dd4c7aa2a088488981095ff3b2'
  },
  jwt: {
    secret: 'answer-pro-secret-key',
    expiresIn: '7d'
  },
  database: {
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: 'wxx0324', // 替换为您的数据库密码
    database: 'answer_pro',
    dialect: 'mysql'
  }
}; 