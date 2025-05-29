const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transferController');
const { auth } = require('../middlewares/auth');

// 🚀 微信支付转账回调通知（无需认证）
router.post('/wechat/notify', transferController.handleWechatNotify);

// 🚀 查询转账记录（需要认证）
router.get('/records', auth, transferController.getTransferRecords);

// 🚀 重试失败的转账（需要认证）
router.post('/retry/:transfer_id', auth, transferController.retryTransfer);

// 🚀 获取转账统计信息（管理员接口）
router.get('/stats', auth, transferController.getTransferStats);

module.exports = router; 