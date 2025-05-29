const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TransferRecord = sequelize.define('TransferRecord', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: '主键'
    },
    user_id: {
      type: DataTypes.STRING(32),
      allowNull: false,
      comment: '用户ID'
    },
    lottery_record_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '关联的抽奖记录ID'
    },
    transfer_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: '转账金额(元)'
    },
    out_trade_no: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
      comment: '商户订单号'
    },
    partner_trade_no: {
      type: DataTypes.STRING(32),
      allowNull: true,
      comment: '微信订单号'
    },
    transfer_status: {
      type: DataTypes.ENUM('pending', 'processing', 'success', 'failed', 'retry'),
      defaultValue: 'pending',
      comment: '转账状态'
    },
    failure_reason: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '失败原因'
    },
    retry_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '重试次数'
    },
    max_retry_count: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
      comment: '最大重试次数'
    },
    next_retry_time: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '下次重试时间'
    },
    transfer_time: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '转账完成时间'
    },
    wechat_response: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '微信返回的完整响应'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: '创建时间'
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: '更新时间'
    }
  }, {
    tableName: 'transfer_record',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: '转账记录表',
    indexes: [
      {
        name: 'uk_out_trade_no',
        unique: true,
        fields: ['out_trade_no']
      },
      {
        name: 'idx_user_id',
        fields: ['user_id']
      },
      {
        name: 'idx_lottery_record_id',
        fields: ['lottery_record_id']
      },
      {
        name: 'idx_transfer_status',
        fields: ['transfer_status']
      },
      {
        name: 'idx_created_at',
        fields: ['created_at']
      }
    ]
  });

  // 定义关联关系
  TransferRecord.associate = function(models) {
    // 转账记录属于用户
    TransferRecord.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    
    // 转账记录属于抽奖记录
    TransferRecord.belongsTo(models.LotteryRecord, {
      foreignKey: 'lottery_record_id',
      as: 'lotteryRecord'
    });
    
    // 一个转账记录有多个操作日志
    TransferRecord.hasMany(models.TransferLog, {
      foreignKey: 'transfer_record_id',
      as: 'logs'
    });
  };

  return TransferRecord;
}; 