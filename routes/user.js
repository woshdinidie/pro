const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth } = require('../middlewares/auth');

// 用户登录
router.post('/login', userController.login);

// 静默登录（用于已注册用户快速登录）
router.post('/silent-login', userController.silentLogin);

// 获取手机号（登录前使用，不需要认证）
router.post('/get-phone-number', userController.getPhoneNumber);

// 获取用户信息
router.get('/info', auth, userController.getUserInfo);

// 更新用户信息
router.put('/info', auth, userController.updateUserInfo);

// 获取积分记录
router.get('/points', auth, userController.getPointRecords);

// 获取排行榜
router.get('/rankings', auth, userController.getRankingList);

// 绑定手机号
router.post('/bind-phone', auth, userController.bindPhone);

module.exports = router; 