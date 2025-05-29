const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TransferLog = sequelize.define('TransferLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: '主键'
    },
    transfer_record_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '转账记录ID'
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '操作类型'
    },
    status_before: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '操作前状态'
    },
    status_after: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '操作后状态'
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '日志信息'
    },
    operator: {
      type: DataTypes.STRING(50),
      defaultValue: 'system',
      comment: '操作者'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: '创建时间'
    }
  }, {
    tableName: 'transfer_log',
    timestamps: false,
    comment: '转账操作日志表',
    indexes: [
      {
        name: 'idx_transfer_record_id',
        fields: ['transfer_record_id']
      },
      {
        name: 'idx_created_at',
        fields: ['created_at']
      }
    ]
  });

  // 定义关联关系
  TransferLog.associate = function(models) {
    // 转账日志属于转账记录
    TransferLog.belongsTo(models.TransferRecord, {
      foreignKey: 'transfer_record_id',
      as: 'transferRecord'
    });
  };

  return TransferLog;
}; 