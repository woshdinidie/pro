const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');
const redisClient = require('./redis'); // 确保引入 redisClient
const logger = require('./logger'); // 引入logger

class StatsCache {
  constructor() {
    // 不再使用内存缓存 this.cache 和 this.updateQueue
    // this.cache = new Map();
    // this.updateQueue = new Map();
    // this.batchTimer = null;
    
    this.cleanupTimer = null;
    this.dailyCleanupInterval = null;
    this.scheduleDailyCleanup(); // 重命名
    
    logger.info('统计缓存系统已启动 (Redis模式)');
  }

  getRedisKey(userId) {
    const today = new Date().toISOString().split('T')[0];
    return `stats:${userId}:${today}`;
  }

  getDefaultRawStats() {
    return {
      answer_count: 0,
      correct_count: 0,
      pk_count: 0,
      pk_win_count: 0
    };
  }
  
  // 格式化从Redis获取的原始统计数据（字符串转数字）
  parseRawStats(rawStats) {
    const defaults = this.getDefaultRawStats();
    const parsed = {};
    for (const key in defaults) {
      parsed[key] = rawStats && rawStats[key] !== undefined ? parseInt(rawStats[key], 10) : defaults[key];
    }
    return parsed;
  }


  async getStats(userId) {
    const redisKey = this.getRedisKey(userId);
    let stats;

    try {
      const rawStats = await redisClient.hgetall(redisKey);
      if (rawStats && Object.keys(rawStats).length > 0) {
        stats = this.parseRawStats(rawStats);
      } else {
        stats = await this.loadFromDB(userId);
        await redisClient.hmset(redisKey, stats); 
        await redisClient.expire(redisKey, 25 * 3600);
      }
      return this.formatStats(stats);
    } catch (error) {
      logger.error(`[StatsCache] Error getting stats for ${userId} from Redis, falling back to DB`, error);
      try {
        stats = await this.loadFromDB(userId);
        return this.formatStats(stats);
      } catch (dbError) {
        logger.error(`[StatsCache] Error getting stats for ${userId} from DB after Redis failure`, dbError);
        return this.formatStats(this.getDefaultRawStats());
      }
    }
  }

  async loadFromDB(userId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [result] = await sequelize.query(`
        SELECT 
          answer_count, correct_count, pk_count, pk_win_count
        FROM user_today_stats 
        WHERE user_id = ? AND update_date = ?
      `, {
        replacements: [userId, today],
        type: QueryTypes.SELECT
      });
      return result || this.getDefaultRawStats();
    } catch (error) {
      logger.error(`[StatsCache] DB load error for ${userId}:`, error);
      return this.getDefaultRawStats();
    }
  }

  async incrementStats(userId, type, isCorrect = null) {
    const redisKey = this.getRedisKey(userId);
    let fieldToIncrement;
    let secondaryField = null;
    let incrementValue = 1;

    if (type === 'answer') {
      fieldToIncrement = 'answer_count';
      if (isCorrect) secondaryField = 'correct_count';
    } else if (type === 'pk') {
      fieldToIncrement = 'pk_count';
      if (isCorrect === 1) secondaryField = 'pk_win_count';
    } else {
      logger.warn(`[StatsCache] Unknown stats type: ${type} for user ${userId}`);
      return;
    }

    try {
      await redisClient.hincrby(redisKey, fieldToIncrement, incrementValue);
      if (secondaryField) {
        await redisClient.hincrby(redisKey, secondaryField, incrementValue);
      }
      await redisClient.expire(redisKey, 25 * 3600);
      this.updateDBInBackground(userId, redisKey);
    } catch (error) {
      logger.error(`[StatsCache] Error incrementing stats for ${userId} in Redis:`, error);
    }
  }
  
  async updateDBInBackground(userId, redisKey) {
    try {
      const rawStats = await redisClient.hgetall(redisKey);
      if (rawStats && Object.keys(rawStats).length > 0) {
        const statsToSave = this.parseRawStats(rawStats);
        await this.updateDB(userId, statsToSave);
      }
    } catch (error) {
      logger.error(`[StatsCache] Background DB update failed for ${userId}:`, error);
    }
  }

  async updateDB(userId, stats) { // stats是包含计数的对象
    const today = new Date().toISOString().split('T')[0];
    try {
      await sequelize.query(`
        INSERT INTO user_today_stats (
          user_id, answer_count, correct_count, pk_count, pk_win_count, update_date
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          answer_count = VALUES(answer_count),
          correct_count = VALUES(correct_count),
          pk_count = VALUES(pk_count),
          pk_win_count = VALUES(pk_win_count),
          last_updated = NOW()
      `, {
        replacements: [
          userId, 
          stats.answer_count || 0, 
          stats.correct_count || 0, 
          stats.pk_count || 0, 
          stats.pk_win_count || 0, 
          today
        ],
        type: QueryTypes.UPSERT // 或者 INSERT, 取决于你的表是否有自增ID等
      });
    } catch (error) {
       logger.error(`[StatsCache] DB upsert error for ${userId}:`, error);
    }
  }

  formatStats(stats) { // stats 是包含数字计数的对象
    const correctRate = (stats.answer_count || 0) > 0 
      ? Math.round(((stats.correct_count || 0) / (stats.answer_count || 0)) * 100) + '%'
      : '0%';
    const pkWinRate = (stats.pk_count || 0) > 0
      ? Math.round(((stats.pk_win_count || 0) / (stats.pk_count || 0)) * 100) + '%'
      : '0%';

    return {
      answerCount: stats.answer_count || 0,
      correctRate,
      pkWinRate
    };
  }

  // 优雅停机时，确保所有Redis中的今日数据被同步到数据库
  // 注意：这可能是一个耗时操作，取决于有多少活跃用户的统计需要同步
  async forceFlush() {
    logger.info('[StatsCache] Starting forceFlush for graceful shutdown...');
    try {
      const iterator = redisClient.getScanIterator({
        MATCH: 'stats:*:*', 
        COUNT: 100 
      });
      
      let syncedCount = 0;
      for await (const key of iterator) { 
        if (key) { 
          const parts = key.split(':');
          if (parts.length === 3 && parts[0] === 'stats') {
            const userId = parts[1];
            await this.updateDBInBackground(userId, key);
            syncedCount++;
          }
        }
      }
      logger.info(`[StatsCache] forceFlush completed. Synced ${syncedCount} user stats records to DB.`);
    } catch (error) {
      logger.error('[StatsCache] Error during forceFlush:', error);
    }
    if (this.cleanupTimer) clearTimeout(this.cleanupTimer);
    if (this.dailyCleanupInterval) clearInterval(this.dailyCleanupInterval);
    logger.info('[StatsCache] StatsCache shutdown complete.');
  }
  
  // 每日清理 Redis 中可能存在的非当日的旧的 stats key (虽然有expire，但作为保险)
  scheduleDailyCleanup() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(1, 0, 0, 0); // 凌晨1点执行
    
    const msUntilExecution = tomorrow.getTime() - now.getTime();
    
    this.cleanupTimer = setTimeout(() => {
      this.performDailyRedisCleanup();
      this.dailyCleanupInterval = setInterval(() => {
        this.performDailyRedisCleanup();
      }, 24 * 60 * 60 * 1000); // 每天执行一次
    }, msUntilExecution);
  }

  async performDailyRedisCleanup() {
    logger.info('[StatsCache] Performing daily Redis cleanup for old stats keys...');
    const todayKeyPart = new Date().toISOString().split('T')[0];
    let deletedCount = 0;
    try {
      const iterator = redisClient.getScanIterator({ MATCH: 'stats:*:*' });
      for await (const key of iterator) {
        if (key && !key.endsWith(todayKeyPart)) {
          await redisClient.del(key);
          deletedCount++;
        }
      }
      logger.info(`[StatsCache] Daily Redis cleanup finished. Deleted ${deletedCount} old keys.`);
    } catch (error) {
      logger.error('[StatsCache] Error during daily Redis cleanup:', error);
    }
  }
}

const statsCacheInstance = new StatsCache();
module.exports = statsCacheInstance; 