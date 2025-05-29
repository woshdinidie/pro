const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');
const { auth } = require('../middlewares/auth');

// 创建PK对战
router.post('/create', auth, matchController.createMatch);

// 获取PK题目
router.get('/:match_id/question', auth, matchController.getMatchQuestion);

// 提交PK答案
router.post('/:match_id/answer', auth, matchController.submitMatchAnswer);

// 获取PK结果
router.get('/:match_id/result', auth, matchController.getMatchResult);

module.exports = router; 