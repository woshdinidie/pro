module.exports = (sequelize, DataTypes) => {
  const ShareRecord = sequelize.define('ShareRecord', {
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
    share_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: '分享日期'
    },
    share_type: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1,
      comment: '分享类型：1-答题分享'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'share_record',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  ShareRecord.associate = (models) => {
    // 分享记录与用户的关联，不创建物理外键
    ShareRecord.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
      constraints: false  // 不创建外键约束
    });
  };

  return ShareRecord;
}; 