require('dotenv').config();
const { User } = require('./models');

async function checkUsers() {
  try {
    // 查看现有用户
    const users = await User.findAll();
    console.log('数据库中的用户数量:', users.length);
    
    if (users.length > 0) {
      console.log('现有用户:');
      users.forEach(user => {
        console.log('- ID:', user.id);
        console.log('  昵称:', user.nickname);
        console.log('  手机号:', user.phone || '无');
        console.log('  积分:', user.total_points);
        console.log('  创建时间:', user.created_at);
        console.log('---');
      });
    } else {
      console.log('数据库中没有用户，创建测试用户...');
      
      // 创建一个测试用户，用于静默登录测试
      const testUser = await User.create({
        id: 'test_openid_default',
        nickname: '测试用户',
        avatar_url: '/assets/images/default-avatar.png',
        gender: 0,
        phone: '',
        total_points: 100,
        status: 1,
        last_login_time: new Date()
      });
      
      console.log('测试用户创建成功:', {
        id: testUser.id,
        nickname: testUser.nickname,
        total_points: testUser.total_points
      });
    }
    
  } catch (error) {
    console.error('操作失败:', error.message);
  } finally {
    process.exit(0);
  }
}

checkUsers(); 