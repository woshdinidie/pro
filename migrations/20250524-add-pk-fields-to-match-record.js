'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 添加新字段
      await queryInterface.addColumn('match_record', 'opponent_score', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: '对手得分'
      }, { transaction });

      await queryInterface.addColumn('match_record', 'total_questions', {
        type: Sequelize.INTEGER,
        defaultValue: 10,
        comment: '总题目数'
      }, { transaction });

      await queryInterface.addColumn('match_record', 'current_question', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: '当前题目索引'
      }, { transaction });

      await queryInterface.addColumn('match_record', 'status', {
        type: Sequelize.STRING(20),
        defaultValue: 'playing',
        comment: '对战状态：playing-进行中, finished-已完成'
      }, { transaction });

      await queryInterface.addColumn('match_record', 'points_earned', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: '获得的积分'
      }, { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 删除添加的字段
      await queryInterface.removeColumn('match_record', 'opponent_score', { transaction });
      await queryInterface.removeColumn('match_record', 'total_questions', { transaction });
      await queryInterface.removeColumn('match_record', 'current_question', { transaction });
      await queryInterface.removeColumn('match_record', 'status', { transaction });
      await queryInterface.removeColumn('match_record', 'points_earned', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}; 