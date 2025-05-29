const { User } = require('./models');

async function updateUserNickname() {
  try {
    console.log('开始更新用户昵称...');
    
    // 查找昵称为"1"的用户
    const users = await User.findAll({
      where: {
        nickname: '1'
      }
    });
    
    console.log(`找到 ${users.length} 个昵称为"1"的用户`);
    
    for (const user of users) {
      console.log(`更新用户 ${user.id} 的昵称...`);
      
      await user.update({
        nickname: '答题达人'
      });
      
      console.log(`用户 ${user.id} 昵称已更新为"答题达人"`);
    }
    
    console.log('用户昵称更新完成！');
    process.exit(0);
    
  } catch (error) {
    console.error('更新用户昵称失败:', error);
    process.exit(1);
  }
}

updateUserNickname(); 