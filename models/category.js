module.exports = (sequelize, DataTypes) => {
  const Category = sequelize.define('Category', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '分类名称'
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '分类描述'
    },
    icon: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '分类图标'
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: '排序顺序'
    },
    status: {
      type: DataTypes.TINYINT,
      allowNull: true,
      defaultValue: 1,
      comment: '状态：0-禁用，1-启用'
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
    tableName: 'category',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: false
  });

  Category.associate = (models) => {
    // 分类与问题的关联
    Category.hasMany(models.Question, {
      foreignKey: 'category_id',
      as: 'questions'
    });
    
    // 分类与知识库内容的关联
    Category.hasMany(models.Knowledge, {
      foreignKey: 'category_id',
      as: 'knowledgeItems'
    });
  };

  return Category;
}; 