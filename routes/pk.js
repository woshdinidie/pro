const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const pkController = require('../controllers/pkController');

// 获取PK统计信息
router.get('/summary', auth, pkController.getPkSummary);

// 创建PK对战
router.post('/create', auth, pkController.createMatch);

// 获取PK题目
router.get('/:matchId/question', auth, pkController.getMatchQuestion);

// 提交PK答案
router.post('/:matchId/answer', auth, pkController.submitMatchAnswer);

// 获取PK历史记录
router.get('/history', auth, pkController.getPkHistory);

module.exports = router; 