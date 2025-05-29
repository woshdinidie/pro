const express = require('express');
const router = express.Router();
const shareController = require('../controllers/shareController');
const { auth } = require('../middlewares/auth');

// 记录分享
router.post('/record', auth, shareController.recordShare);

// 获取分享记录
router.get('/records', auth, shareController.getShareRecords);

module.exports = router; 