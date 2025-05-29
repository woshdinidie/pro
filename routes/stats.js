const express = require('express');
const router = express.Router();
const { getTodayStats, updateStats, flushCache } = require('../controllers/statsController');
const { auth } = require('../middlewares/auth');

// 获取今日统计数据
router.get('/today', auth, getTodayStats);

// 手动更新统计（测试用）
router.post('/update', auth, updateStats);

// 强制刷新缓存（管理用）
router.post('/flush', auth, flushCache);

module.exports = router; 