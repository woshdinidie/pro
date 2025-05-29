const { createClient } = require('redis');
const logger = require('./logger');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.initPromise = null;
    this.init();
  }

  async init() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._performInit();
    return this.initPromise;
  }

  async _performInit() {
    try {
      // 创建Redis客户端 (Redis 4.6.5 API)
      this.client = createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          connectTimeout: 5000, // 5秒连接超时
          reconnectStrategy: (retries) => {
            if (retries > 3) {
              logger.warn('Redis重连次数超限，停止重连');
              return false;
            }
            const delay = Math.min(retries * 1000, 3000);
            logger.info(`Redis重连第${retries}次，延迟${delay}ms`);
            return delay;
          }
        },
        password: process.env.REDIS_PASSWORD || undefined,
        database: parseInt(process.env.REDIS_DB || '0')
      });

      // 监听连接事件
      this.client.on('connect', () => {
        logger.info('Redis连接中...');
      });

      this.client.on('ready', () => {
        logger.info('Redis连接成功，可以使用');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        logger.error('Redis连接错误:', err.message);
        this.isConnected = false;
      });

      this.client.on('end', () => {
        logger.info('Redis连接断开');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis正在重连...');
        this.isConnected = false;
      });

      // 连接到Redis，设置超时
      const connectPromise = this.client.connect();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Redis连接超时')), 5000);
      });

      await Promise.race([connectPromise, timeoutPromise]);
      logger.info('Redis初始化成功');

    } catch (error) {
      logger.warn('Redis初始化失败，将在无Redis模式下运行:', error.message);
      this.isConnected = false;
      this.client = null;
    }
  }

  /**
   * 确保Redis已初始化
   */
  async ensureInitialized() {
    if (!this.initPromise) {
      await this.init();
    } else {
      await this.initPromise;
    }
  }

  /**
   * 检查Redis是否可用
   */
  async isAvailable() {
    await this.ensureInitialized();
    return this.client && this.isConnected && this.client.isReady;
  }

  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} ttl - 过期时间（秒），默认30分钟
   */
  async set(key, value, ttl = 1800) {
    try {
      if (!(await this.isAvailable())) {
        logger.debug('Redis不可用，跳过缓存设置');
        return false;
      }

      const serializedValue = JSON.stringify(value);
      await this.client.setEx(key, ttl, serializedValue);
      return true;
    } catch (error) {
      logger.error('Redis设置缓存失败:', error.message);
      return false;
    }
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存键
   */
  async get(key) {
    try {
      if (!(await this.isAvailable())) {
        return null;
      }

      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis获取缓存失败:', error.message);
      return null;
    }
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   */
  async del(key) {
    try {
      if (!(await this.isAvailable())) {
        return false;
      }

      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Redis删除缓存失败:', error.message);
      return false;
    }
  }

  /**
   * 清空匹配模式的缓存
   * @param {string} pattern - 匹配模式
   */
  async delPattern(pattern) {
    try {
      if (!(await this.isAvailable())) {
        return false;
      }

      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      logger.error('Redis批量删除缓存失败:', error.message);
      return false;
    }
  }

  /**
   * 设置用户缓存
   * @param {string} userId - 用户ID
   * @param {object} userData - 用户数据
   */
  async setUser(userId, userData) {
    const key = `user:${userId}`;
    return await this.set(key, userData, 3600); // 1小时过期
  }

  /**
   * 获取用户缓存
   * @param {string} userId - 用户ID
   */
  async getUser(userId) {
    const key = `user:${userId}`;
    return await this.get(key);
  }

  /**
   * 删除用户缓存
   * @param {string} userId - 用户ID
   */
  async delUser(userId) {
    const key = `user:${userId}`;
    return await this.del(key);
  }

  /**
   * 设置用户会话缓存（用于防重复登录）
   * @param {string} userId - 用户ID
   * @param {string} sessionData - 会话数据
   */
  async setUserSession(userId, sessionData) {
    const key = `session:${userId}`;
    return await this.set(key, sessionData, 7200); // 2小时过期
  }

  /**
   * 获取用户会话缓存
   * @param {string} userId - 用户ID
   */
  async getUserSession(userId) {
    const key = `session:${userId}`;
    return await this.get(key);
  }

  /**
   * 设置分布式锁
   * @param {string} lockKey - 锁键
   * @param {string} lockValue - 锁值（通常是唯一标识）
   * @param {number} ttl - 锁过期时间（秒）
   */
  async setLock(lockKey, lockValue, ttl = 10) {
    try {
      if (!(await this.isAvailable())) {
        // Redis不可用时，使用内存锁模拟（仅对单机有效）
        if (!this.memoryLocks) {
          this.memoryLocks = new Map();
        }
        
        if (this.memoryLocks.has(lockKey)) {
          return false; // 锁已存在
        }
        
        this.memoryLocks.set(lockKey, lockValue);
        // 设置过期清理
        setTimeout(() => {
          if (this.memoryLocks && this.memoryLocks.get(lockKey) === lockValue) {
            this.memoryLocks.delete(lockKey);
          }
        }, ttl * 1000);
        
        return true;
      }

      const result = await this.client.set(lockKey, lockValue, {
        EX: ttl,
        NX: true
      });
      return result === 'OK';
    } catch (error) {
      logger.error('Redis设置锁失败:', error.message);
      return false;
    }
  }

  /**
   * 释放分布式锁
   * @param {string} lockKey - 锁键
   * @param {string} lockValue - 锁值
   */
  async releaseLock(lockKey, lockValue) {
    try {
      if (!(await this.isAvailable())) {
        // 使用内存锁的情况
        if (this.memoryLocks && this.memoryLocks.get(lockKey) === lockValue) {
          this.memoryLocks.delete(lockKey);
          return true;
        }
        return false;
      }

      // 使用Lua脚本确保原子性
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      const result = await this.client.eval(script, {
        keys: [lockKey],
        arguments: [lockValue]
      });
      return result === 1;
    } catch (error) {
      logger.error('Redis释放锁失败:', error.message);
      return false;
    }
  }

  /**
   * 关闭连接
   */
  async close() {
    if (this.client && this.isConnected) {
      try {
        await this.client.quit();
      } catch (error) {
        logger.error('Redis关闭连接失败:', error.message);
      }
    }
  }

  // 🚀 新增：为 hgetall, hmset, hincrby, expire, scanIterator (或等效) 添加封装
  async hgetall(key) {
    try {
      if (!(await this.isAvailable())) return null;
      return await this.client.hGetAll(key); // 注意：hGetAll
    } catch (error) {
      logger.error(`Redis HGETALL for ${key} failed:`, error.message);
      return null;
    }
  }

  async hmset(key, data) { // data 应该是一个对象
    try {
      if (!(await this.isAvailable())) return false;
      await this.client.hSet(key, data); // 注意：hSet 可以直接传入对象
      return true;
    } catch (error) {
      logger.error(`Redis HMSET for ${key} failed:`, error.message);
      return false;
    }
  }

  async hincrby(key, field, value) {
    try {
      if (!(await this.isAvailable())) return null; // 或者抛出错误，或者返回一个表示失败的值
      return await this.client.hIncrBy(key, field, value);
    } catch (error) {
      logger.error(`Redis HINCRBY for ${key}.${field} failed:`, error.message);
      return null;
    }
  }

  async expire(key, ttl) {
    try {
      if (!(await this.isAvailable())) return false;
      await this.client.expire(key, ttl);
      return true;
    } catch (error) {
      logger.error(`Redis EXPIRE for ${key} failed:`, error.message);
      return false;
    }
  }
  
  getScanIterator(options) { // options = { MATCH: pattern, COUNT: count }
    if (!(this.isAvailableSync())) { // scanIterator 通常是同步获取迭代器的
        logger.warn('Redis not available for scanIterator');
        // 返回一个空的异步迭代器以避免后续代码出错
        return (async function* emptyIterator() { yield []; })(); 
    }
    return this.client.scanIterator(options);
  }

  // 内部同步检查，仅用于scanIterator这种需要同步获取迭代器的情况
  isAvailableSync() {
    return this.client && this.isConnected && this.client.isReady;
  }
}

// 单例模式
const redisClient = new RedisClient();

module.exports = redisClient; 