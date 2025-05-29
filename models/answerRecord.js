module.exports = (sequelize, DataTypes) => {
  const AnswerRecord = sequelize.define('AnswerRecord', {
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
    question_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '题目ID',
      references: null  // 禁用外键
    },
    user_answer: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '用户答案'
    },
    is_correct: {
      type: DataTypes.TINYINT,
      allowNull: false,
      comment: '是否正确：0-错误，1-正确'
    },
    earned_points: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '获得积分'
    },
    answer_time: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '答题用时(秒)'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'answer_record',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  AnswerRecord.associate = (models) => {
    // 答题记录与用户的关联，不创建物理外键
    AnswerRecord.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
      constraints: false  // 不创建外键约束
    });

    // 答题记录与问题的关联，不创建物理外键
    AnswerRecord.belongsTo(models.Question, {
      foreignKey: 'question_id',
      as: 'question',
      constraints: false  // 不创建外键约束
    });
  };

  return AnswerRecord;
}; 