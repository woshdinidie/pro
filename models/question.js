module.exports = (sequelize, DataTypes) => {
  const Question = sequelize.define('Question', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '分类ID'
    },
    title: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: '题目标题'
    },
    options: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '选项，JSON格式'
    },
    answer: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '正确答案'
    },
    analysis: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '题目解析'
    },
    difficulty: {
      type: DataTypes.TINYINT,
      allowNull: true,
      defaultValue: 2,
      comment: '难度：1-简单，2-中等，3-困难'
    },
    points: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 10,
      comment: '答对可得积分'
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: true,
      defaultValue: 1,
      comment: '状态：0-禁用，1-启用'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'question',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: false
  });

  Question.associate = (models) => {
    // 问题与分类的关联
    Question.belongsTo(models.Category, {
      foreignKey: 'category_id',
      as: 'category'
    });

    // 问题与答题记录的关联
    Question.hasMany(models.AnswerRecord, {
      foreignKey: 'question_id',
      as: 'answerRecords'
    });
  };

  return Question;
}; 