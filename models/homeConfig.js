module.exports = (sequelize, DataTypes) => {
  const HomeConfig = sequelize.define('HomeConfig', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    type: {
      type: DataTypes.TINYINT,
      allowNull: false,
      comment: '类型：1-头图，2-资讯，3-话题'
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '标题'
    },
    image_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '图片URL'
    },
    link_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '链接URL'
    },
    order_num: {
      type: DataTypes.INTEGER,
      comment: '排序'
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
      comment: '状态：1-启用，0-禁用'
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
    tableName: 'home_config',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  HomeConfig.associate = (models) => {
    // 可能的关联...
  };

  return HomeConfig;
}; 