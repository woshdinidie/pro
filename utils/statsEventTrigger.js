const statsCache = require('./statsCache');

// 统计事件触发器
class StatsEventTrigger {
  
  // 答题完成事件
  static onAnswerComplete(userId, isCorrect) {
    // 使用 setImmediate 确保异步执行，不阻塞主业务
    setImmediate(() => {
      try {
        statsCache.incrementStats(userId, 'answer', isCorrect);
      } catch (error) {
        console.error('触发答题统计失败:', error);
        // 不影响主业务，只记录错误
      }
    });
  }

  // PK完成事件
  static onPKComplete(userId, result) {
    // result: 0-败 1-胜 2-平
    setImmediate(() => {
      try {
        statsCache.incrementStats(userId, 'pk', result);
      } catch (error) {
        console.error('触发PK统计失败:', error);
        // 不影响主业务，只记录错误
      }
    });
  }

  // 批量答题完成事件（如一次答题多题）
  static onBatchAnswerComplete(userId, answers) {
    setImmediate(() => {
      try {
        answers.forEach(answer => {
          statsCache.incrementStats(userId, 'answer', answer.isCorrect);
        });
      } catch (error) {
        console.error('触发批量答题统计失败:', error);
      }
    });
  }

  // 获取统计数据（供其他模块调用）
  static async getStats(userId) {
    try {
      return await statsCache.getStats(userId);
    } catch (error) {
      console.error('获取统计数据失败:', error);
      return {
        answerCount: 0,
        correctRate: '0%',
        pkWinRate: '0%'
      };
    }
  }

  // 手动刷新缓存（维护用）
  static async flushCache() {
    try {
      await statsCache.forceFlush();
      return true;
    } catch (error) {
      console.error('刷新缓存失败:', error);
      return false;
    }
  }
}

module.exports = StatsEventTrigger; 