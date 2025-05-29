// 快速检查环境变量的脚本
require('dotenv').config();

console.log('=== 环境变量检查 ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('WECHAT_DEV_MODE:', process.env.WECHAT_DEV_MODE);
console.log('WECHAT_APPID:', process.env.WECHAT_APPID ? '已设置' : '未设置');
console.log('WECHAT_MCHID:', process.env.WECHAT_MCHID ? '已设置' : '未设置');
console.log('WECHAT_APIKEY:', process.env.WECHAT_APIKEY ? '已设置' : '未设置');

console.log('\n=== 开发模式检查 ===');
const isDevMode = process.env.NODE_ENV === 'development' && process.env.WECHAT_DEV_MODE === 'true';
console.log('开发模式启用:', isDevMode ? '是' : '否');

if (isDevMode) {
  console.log('✅ 开发模式已启用，转账将模拟成功');
} else {
  console.log('❌ 开发模式未启用，需要真实的微信支付配置');
} 