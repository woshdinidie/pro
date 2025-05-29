module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.STRING(32),
      primaryKey: true,
      comment: '用户ID，使用微信openid'
    },
    nickname: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '用户昵称'
    },
    avatar_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '头像URL'
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '手机号码'
    },
    total_points: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '总积分'
    },
    lottery_chances: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '抽奖机会次数'
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
      comment: '状态：1-正常，0-禁用'
    },
    last_login_time: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '最后登录时间'
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
    tableName: 'user',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  User.associate = (models) => {
    // 用户与答题记录的关联
    User.hasMany(models.AnswerRecord, {
      foreignKey: 'user_id',
      as: 'answerRecords'
    });

    // 用户与PK对战的关联
    User.hasMany(models.MatchRecord, {
      foreignKey: 'user_id',
      as: 'matches'
    });

    // 用户与积分记录的关联
    User.hasMany(models.PointRecord, {
      foreignKey: 'user_id',
      as: 'pointRecords'
    });

    // 用户与奖品记录的关联
    User.hasMany(models.PrizeRecord, {
      foreignKey: 'user_id',
      as: 'prizeRecords'
    });

    // 用户与分享记录的关联
    User.hasMany(models.ShareRecord, {
      foreignKey: 'user_id',
      as: 'shareRecords'
    });
  };

  return User;
}; 