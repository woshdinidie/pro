const statsCache = require('../utils/statsCache');

// 获取今日统计数据
const getTodayStats = async (req, res) => {
  try {
    const userId = req.user.user_id;
    
    if (!userId) {
      return res.status(401).json({
        code: 401,
        message: '用户未登录'
      });
    }

    const stats = await statsCache.getStats(userId);
    
    res.json({
      code: 0,
      message: '获取成功',
      data: stats
    });
    
  } catch (error) {
    console.error('获取今日统计失败:', error);
    
    // 降级处理：返回默认值，不影响页面显示
    res.json({
      code: 0,
      message: '获取成功',
      data: {
        answerCount: 0,
        correctRate: '0%',
        pkWinRate: '0%'
      }
    });
  }
};

// 手动触发统计更新（测试用）
const updateStats = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { type, isCorrect } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        code: 401,
        message: '用户未登录'
      });
    }

    if (!['answer', 'pk'].includes(type)) {
      return res.status(400).json({
        code: 400,
        message: '无效的统计类型'
      });
    }

    statsCache.incrementStats(userId, type, isCorrect);
    
    res.json({
      code: 0,
      message: '统计更新成功'
    });
    
  } catch (error) {
    console.error('更新统计失败:', error);
    res.status(500).json({
      code: 500,
      message: '更新统计失败'
    });
  }
};

// 强制刷新缓存到数据库（管理用）
const flushCache = async (req, res) => {
  try {
    await statsCache.forceFlush();
    
    res.json({
      code: 0,
      message: '缓存刷新成功'
    });
    
  } catch (error) {
    console.error('刷新缓存失败:', error);
    res.status(500).json({
      code: 500,
      message: '刷新缓存失败'
    });
  }
};

module.exports = {
  getTodayStats,
  updateStats,
  flushCache
}; 