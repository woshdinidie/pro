const { User } = require('./models');
const redisClient = require('./utils/redis');
const logger = require('./utils/logger');

async function checkUserPoints(userId) {
  try {
    console.log('=== 用户积分检查 ===');
    
    // 1. 检查数据库中的积分
    const user = await User.findByPk(userId);
    if (!user) {
      console.log('数据库中未找到该用户');
      return;
    }
    console.log('数据库中的积分:', user.total_points);
    
    // 2. 检查Redis缓存中的积分
    const cachedUser = await redisClient.getUser(userId);
    if (!cachedUser) {
      console.log('Redis缓存中未找到该用户');
    } else {
      console.log('Redis缓存中的积分:', cachedUser.total_points);
    }
    
    // 3. 比较差异
    if (cachedUser && user.total_points !== cachedUser.total_points) {
      console.log('警告：数据库和缓存中的积分不一致！');
      console.log('差异值:', user.total_points - cachedUser.total_points);
      
      // 4. 自动修复缓存
      const userJson = user.toJSON();
      await redisClient.setUser(userId, userJson);
      console.log('已更新Redis缓存为数据库中的值');
    } else if (cachedUser) {
      console.log('数据库和缓存中的积分一致');
    }
    
  } catch (error) {
    console.error('检查积分时出错:', error);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  // 这里填入要检查的用户ID
  const userId = process.argv[2];
  
  if (!userId) {
    console.log('请提供用户ID作为参数');
    process.exit(1);
  }
  
  checkUserPoints(userId).then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('运行出错:', error);
    process.exit(1);
  });
}

module.exports = checkUserPoints; 