module.exports = (sequelize, DataTypes) => {
  const MatchRecord = sequelize.define('MatchRecord', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.STRING(32),
      allowNull: false,
      comment: '用户ID',
      references: null  // 禁用外键
    },
    user_score: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '用户得分'
    },
    opponent_score: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '对手得分'
    },
    total_questions: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
      comment: '总题目数'
    },
    current_question: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '当前题目索引'
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'playing',
      comment: '对战状态：playing-进行中, finished-已完成'
    },
    result: {
      type: DataTypes.TINYINT,
      allowNull: true,
      comment: '结果：0-负 1-胜 2-平'
    },
    points_earned: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '获得的积分'
    },
    robot_score: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '机器人得分(保持向后兼容)'
    },
    questions: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '题目列表，JSON格式'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'match_record',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  MatchRecord.associate = (models) => {
    // 对战记录与用户的关联，不创建物理外键
    MatchRecord.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
      constraints: false  // 不创建外键约束
    });
  };

  return MatchRecord;
}; 