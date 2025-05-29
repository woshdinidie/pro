const express = require('express');
const router = express.Router();
const lotteryController = require('../controllers/lotteryController');
const { auth } = require('../middlewares/auth');

// 开始抽奖
router.post('/start', auth, lotteryController.startLottery);

// 记录抽奖结果
router.post('/record', auth, lotteryController.recordResult);

// 给予抽奖机会（答题完成后调用）
router.post('/grant-chance', auth, lotteryController.grantLotteryChance);

// 获取抽奖记录
router.get('/records', auth, lotteryController.getRecords);

// 🚀 新增：查询转账状态
router.get('/transfer-status/:lottery_record_id', auth, lotteryController.getTransferStatus);

module.exports = router; 