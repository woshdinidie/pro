module.exports = (sequelize, DataTypes) => {
  const PointRecord = sequelize.define('PointRecord', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.STRING(32),
      allowNull: false,
      comment: '用户ID',
      references: null  // 明确设置为null，禁用外键
    },
    points: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '积分变动数量'
    },
    type: {
      type: DataTypes.TINYINT,
      allowNull: false,
      comment: '类型：1-答题获得 2-PK获得 3-抽奖消耗 4-其他'
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '积分变动描述'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'point_record',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['created_at']
      }
    ]
  });

  PointRecord.associate = (models) => {
    // 积分记录与用户的关联，不创建物理外键
    PointRecord.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
      constraints: false
    });
  };

  return PointRecord;
};