const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const userController = require('../controllers/userController');

// 用户登录
router.post('/login', userController.login);

// 获取用户信息(需要认证)
router.get('/info', authenticate, userController.getUserInfo);

// 更新用户信息(需要认证)
router.put('/info', authenticate, userController.updateUserInfo);

// 获取积分记录
router.get('/points', authenticate, userController.getPointRecords);

// 获取排行榜
router.get('/rankings', authenticate, userController.getRankingList);

module.exports = router; 