module.exports = (sequelize, DataTypes) => {
  const Prize = sequelize.define('Prize', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '奖品名称'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '奖品描述'
    },
    image: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '奖品图片'
    },
    type: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: '奖品类型：1-现金红包，2-积分'
    },
    value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: '奖品价值（现金金额或积分数量）'
    },
    probability: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: false,
      comment: '抽中概率'
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
      comment: '状态：0-下架，1-上架'
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
    tableName: 'prize',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  });

  Prize.associate = (models) => {
    // 奖品与奖品记录的关联
    Prize.hasMany(models.PrizeRecord, {
      foreignKey: 'prize_id',
      as: 'prizeRecords'
    });
  };

  return Prize;
}; 