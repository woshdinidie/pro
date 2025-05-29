module.exports = (sequelize, DataTypes) => {
  const LotteryRecord = sequelize.define('LotteryRecord', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.STRING(32),
      allowNull: false,
      comment: '用户ID'
    },
    prize_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '奖品ID'
    },
    prize_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '奖品名称'
    },
    prize_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '奖品类型'
    },
    prize_value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: '奖品价值'
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
      comment: '状态：1-已发放，0-未发放'
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
    tableName: 'lottery_record',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['created_at']
      }
    ]
  });

  LotteryRecord.associate = (models) => {
    LotteryRecord.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
      constraints: false
    });
  };

  return LotteryRecord;
}; 