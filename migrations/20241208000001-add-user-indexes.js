'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 为 user 表添加索引优化并发查询性能
    
    // 1. 为 phone 字段添加唯一索引（如果需要手机号唯一性）
    await queryInterface.addIndex('user', ['phone'], {
      name: 'idx_user_phone',
      unique: false // 设置为 false，因为可能有空值
    });
    
    // 2. 为 status 字段添加索引（用于过滤有效用户）
    await queryInterface.addIndex('user', ['status'], {
      name: 'idx_user_status'
    });
    
    // 3. 为 last_login_time 字段添加索引（用于活跃用户统计）
    await queryInterface.addIndex('user', ['last_login_time'], {
      name: 'idx_user_last_login_time'
    });
    
    // 4. 为 created_at 字段添加索引（用于新用户统计）
    await queryInterface.addIndex('user', ['created_at'], {
      name: 'idx_user_created_at'
    });
    
    // 5. 为 total_points 字段添加索引（用于排行榜查询）
    await queryInterface.addIndex('user', ['total_points'], {
      name: 'idx_user_total_points'
    });
    
    // 6. 复合索引：status + total_points （用于有效用户积分排行）
    await queryInterface.addIndex('user', ['status', 'total_points'], {
      name: 'idx_user_status_points'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // 删除添加的索引
    await queryInterface.removeIndex('user', 'idx_user_phone');
    await queryInterface.removeIndex('user', 'idx_user_status');
    await queryInterface.removeIndex('user', 'idx_user_last_login_time');
    await queryInterface.removeIndex('user', 'idx_user_created_at');
    await queryInterface.removeIndex('user', 'idx_user_total_points');
    await queryInterface.removeIndex('user', 'idx_user_status_points');
  }
}; 