const redis = require('redis');
const logger = require('../utils/logger');

// 创建Redis客户端
const createRedisClient = async () => {
  const client = redis.createClient({
    url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
    password: process.env.REDIS_PASSWORD || undefined
  });

  // 错误处理
  client.on('error', (err) => {
    logger.error('Redis错误:', err);
  });

  // 连接处理
  client.on('connect', () => {
    logger.info('Redis连接成功');
  });

  // 重新连接处理
  client.on('reconnecting', () => {
    logger.info('Redis正在重新连接');
  });

  try {
    await client.connect();
  } catch (err) {
    logger.error('Redis连接失败:', err);
  }

  return client;
};

// 单例模式，确保只创建一个Redis客户端实例
let redisClient;

const getRedisClient = async () => {
  if (!redisClient) {
    redisClient = await createRedisClient();
  }
  return redisClient;
};

// 缓存数据工具函数
const setCache = async (key, value, expireTime = 3600) => {
  const client = await getRedisClient();
  await client.set(key, JSON.stringify(value));
  if (expireTime > 0) {
    await client.expire(key, expireTime);
  }
};

// 获取缓存数据工具函数
const getCache = async (key) => {
  const client = await getRedisClient();
  const data = await client.get(key);
  return data ? JSON.parse(data) : null;
};

// 删除缓存数据工具函数
const delCache = async (key) => {
  const client = await getRedisClient();
  await client.del(key);
};

module.exports = {
  getRedisClient,
  setCache,
  getCache,
  delCache
}; 