module.exports = (sequelize, DataTypes) => {
  const Knowledge = sequelize.define('Knowledge', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '标题'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '内容'
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '分类ID'
    },
    view_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '浏览次数'
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
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
      comment: '状态：0-禁用，1-启用'
    }
  }, {
    tableName: 'knowledge',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  });

  Knowledge.associate = (models) => {
    // 知识库与分类的关联
    Knowledge.belongsTo(models.Category, {
      foreignKey: 'category_id',
      as: 'category'
    });
  };

  return Knowledge;
}; 