const express = require('express');
const router = express.Router();

// 导入各个模块的路由
const userRoutes = require('./user');
const questionRoutes = require('./questionRoutes');
const matchRoutes = require('./match');
const shareRoutes = require('./share');
const lotteryRoutes = require('./lottery');
const pkRoutes = require('./pk');
const statsRoutes = require('./stats');
const transferRoutes = require('./transfer');

// 注册路由
router.use('/user', userRoutes);
router.use('/question', questionRoutes);
// answer路由暂未实现
//router.use('/answer', answerRoutes);
router.use('/match', matchRoutes);
// prize路由暂未实现
//router.use('/prize', prizeRoutes);
router.use('/share', shareRoutes);
router.use('/lottery', lotteryRoutes);
router.use('/pk', pkRoutes);
router.use('/stats', statsRoutes);
router.use('/transfer', transferRoutes);

// 首页路由
router.get('/', (req, res) => {
  res.json({ message: '答题小程序API服务正在运行...' });
});

module.exports = router; 