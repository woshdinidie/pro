const express = require('express');
const questionController = require('../controllers/questionController');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

// 获取题目分类列表 (无需登录)
router.get('/categories', questionController.getCategoryList);

// 获取随机题目 (临时移除登录要求用于测试)
router.get('/random', questionController.getRandomQuestion);

// 获取随机题目列表 (批量获取，用于答题功能)
router.get('/list', questionController.getRandomQuestions);

// 提交答案 (需要登录认证)
router.post('/answer', authenticate, questionController.submitAnswer);

// 🚀 新增：批量提交答题结果 (需要登录认证)
router.post('/submit-results', authenticate, questionController.submitQuizResults);

// 获取答题历史 (需要登录)
router.get('/history', authenticate, questionController.getAnswerHistory);

module.exports = router; 