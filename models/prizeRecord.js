module.exports = (sequelize, DataTypes) => {
  const PrizeRecord = sequelize.define('PrizeRecord', {
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
    prize_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '奖品ID',
      references: null  // 禁用外键
    },
    exchange_time: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: '获得时间'
    },
    prize_value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: '奖品价值（现金金额或积分数量）'
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: 0,
      comment: '状态：0-待发放，1-已发放，2-已完成'
    },
    remark: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '备注'
    }
  }, {
    tableName: 'prize_record',
    timestamps: false
  });

  PrizeRecord.associate = (models) => {
    // 奖品记录与用户的关联，不创建物理外键
    PrizeRecord.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
      constraints: false  // 不创建外键约束
    });

    // 奖品记录与奖品的关联，不创建物理外键
    PrizeRecord.belongsTo(models.Prize, {
      foreignKey: 'prize_id',
      as: 'prize',
      constraints: false  // 不创建外键约束
    });
  };

  return PrizeRecord;
}; 