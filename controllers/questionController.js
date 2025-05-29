const logger = require('../utils/logger');
const response = require('../utils/response');
const { User, Question, Category, AnswerRecord } = require('../models');
const { Op } = require('sequelize');
const StatsEventTrigger = require('../utils/statsEventTrigger');
const { sequelize } = require('../models');
const redisClient = require('../utils/redis');

/**
 * 获取随机题目（单题）
 */
const getRandomQuestion = async (req, res) => {
  try {
    const { categoryId, difficulty } = req.query;
    const whereClause = {};
    
    // 添加筛选条件
    if (categoryId && categoryId !== 'null') whereClause.category_id = categoryId;
    if (difficulty && difficulty !== 'null') whereClause.difficulty = difficulty;
    
    // 查询符合条件的题目数量
    const count = await Question.count({ where: whereClause });
    
    if (count === 0) {
      return response.notFound(res, '未找到符合条件的题目');
    }
    
    // 生成随机偏移量
    const randomOffset = Math.floor(Math.random() * count);
    
    // 获取随机题目
    const question = await Question.findOne({
      where: whereClause,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        }
      ],
      offset: randomOffset,
      limit: 1
    });
    
    if (!question) {
      return response.notFound(res, '获取题目失败');
    }
    
    // 处理选项数据
    const options = JSON.parse(question.options);
    
    // 返回数据（不包含答案）
    return response.success(res, {
      questionId: question.id,
      categoryId: question.category_id,
      categoryName: question.category ? question.category.name : '',
      title: question.title,
      options,
      difficulty: question.difficulty,
      points: question.points
    });
  } catch (error) {
    logger.error('获取随机题目失败:', error);
    return response.serverError(res, '获取题目失败');
  }
};

/**
 * 获取随机题目列表（批量）
 */
const getRandomQuestions = async (req, res) => {
  try {
    const { categoryId, difficulty, count = 10 } = req.query;
    const whereClause = {};
    
    // 添加筛选条件
    if (categoryId && categoryId !== 'null') whereClause.category_id = categoryId;
    if (difficulty && difficulty !== 'null') whereClause.difficulty = difficulty;
    
    // 查询符合条件的题目数量
    const totalCount = await Question.count({ where: whereClause });
    
    if (totalCount === 0) {
      return response.notFound(res, '未找到符合条件的题目');
    }
    
    // 确保请求的题目数量不超过可用题目数量
    const requestCount = Math.min(parseInt(count), totalCount, 20); // 最多20题
    
    // 获取所有符合条件的题目ID
    const allQuestions = await Question.findAll({
      where: whereClause,
      attributes: ['id'],
      order: [['id', 'ASC']]
    });
    
    // 随机选择指定数量的题目ID
    const shuffled = allQuestions.sort(() => 0.5 - Math.random());
    const selectedQuestionIds = shuffled.slice(0, requestCount).map(q => q.id);
    
    // 获取选中的题目详情
    const questions = await Question.findAll({
      where: {
        id: selectedQuestionIds
      },
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        }
      ],
      order: [['id', 'ASC']]
    });
    
    // 处理返回数据
    const questionList = questions.map(question => {
      const options = JSON.parse(question.options);
      return {
        questionId: question.id,
        categoryId: question.category_id,
        categoryName: question.category ? question.category.name : '',
        title: question.title,
        options,
        correctAnswer: question.answer, // 前端需要用于判断答案
        analysis: question.analysis,
        difficulty: question.difficulty,
        points: question.points || 1
      };
    });
    
    return response.success(res, {
      questions: questionList,
      total: requestCount
    });
  } catch (error) {
    logger.error('获取随机题目列表失败:', error);
    return response.serverError(res, '获取题目列表失败');
  }
};

/**
 * 提交答案
 */
const submitAnswer = async (req, res) => {
  try {
    // 获取用户ID，优先从认证中间件获取
    const userId = req.user ? req.user.user_id : 1;
    const { questionId, answer, answerTime } = req.body;
    
    logger.info(`=== 用户 ${userId} 提交答案 ===`);
    logger.info(`题目ID: ${questionId}, 答案: ${answer}, 答题时间: ${answerTime}`);
    
    // 验证输入
    if (!questionId || !answer) {
      logger.warn('提交答案参数不完整:', { questionId, answer, answerTime });
      return response.badRequest(res, '缺少必要参数');
    }
    
    // 验证答案格式（确保是字符串）
    if (typeof answer !== 'string') {
      logger.warn('答案格式错误，期望字符串:', { answer, type: typeof answer });
      return response.badRequest(res, '答案格式错误');
    }
    
    // 查找题目
    const question = await Question.findByPk(questionId);
    
    if (!question) {
      logger.warn(`题目不存在: ${questionId}`);
      return response.notFound(res, '题目不存在');
    }
    
    // 判断答案是否正确
    const isCorrect = answer === question.answer;
    
    // 计算获得的积分（正确才加分）
    const earnedPoints = isCorrect ? (question.points || 1) : 0;
    
    logger.info(`答题结果: 正确=${isCorrect}, 获得积分=${earnedPoints}`);
    
    // 更新用户积分
    let user = await User.findByPk(userId);
    
    // 如果用户不存在，创建一个测试用户
    if (!user) {
      logger.info(`用户不存在，创建新用户: ${userId}`);
      user = await User.create({
        id: userId,
        nickname: '测试用户',
        avatar_url: '',
        total_points: 0,
        status: 1
      });
    }
    
    const oldPoints = user.total_points;
    let newPoints = oldPoints;
    
    if (isCorrect && earnedPoints > 0) {
      newPoints = user.total_points + earnedPoints;
      // 使用 increment 原子操作更新用户积分
      await User.increment(
        { total_points: earnedPoints }, 
        { where: { id: userId } }
      );
      logger.info(`用户 ${userId} 积分更新: ${oldPoints} -> ${newPoints}`);

      // 更新Redis缓存
      if (redisClient && typeof redisClient.setUser === 'function') {
        try {
          // increment 不更新 user 实例，所以 user.toJSON() 中的 total_points 是旧的
          const userStateForCache = {
            ...user.toJSON(), 
            total_points: newPoints // 使用计算出的新积分
          };
          await redisClient.setUser(user.id, userStateForCache);
          logger.info(`用户 ${user.id} 的Redis缓存因答题已更新 (新积分: ${newPoints})`);
        } catch (redisError) {
          logger.error(`更新用户 ${user.id} 的Redis缓存失败 (答题):`, redisError);
        }
      }
    } else {
      logger.info(`答题错误，积分不变: ${oldPoints}`);
    }
    
    // 记录答题历史
    const answerRecord = await AnswerRecord.create({
      user_id: userId,
      question_id: questionId,
      user_answer: answer,
      is_correct: isCorrect,
      answer_time: answerTime || 0,
      earned_points: earnedPoints
    });
    
    logger.info(`答题记录已保存: ID=${answerRecord.id}`);

    // 🚀 新增：触发统计更新（异步，不影响主业务）
    try {
      if (typeof StatsEventTrigger !== 'undefined' && StatsEventTrigger.onAnswerComplete) {
    StatsEventTrigger.onAnswerComplete(userId, isCorrect);
      }
    } catch (statsError) {
      logger.warn('统计更新失败:', statsError);
      // 不影响主流程
    }
    
    // 返回结果
    const result = {
      isCorrect,
      correctAnswer: question.answer,
      earnedPoints,
      analysis: question.analysis,
      userPoints: user.total_points  // 返回用户最新总积分
    };
    
    logger.info(`=== 答题处理完成，返回结果 ===`, result);
    
    return response.success(res, result);
  } catch (error) {
    logger.error('提交答案失败:', error);
    logger.error('错误堆栈:', error.stack);
    return response.serverError(res, '提交答案失败');
  }
};

/**
 * 获取答题历史
 */
const getAnswerHistory = async (req, res) => {
  try {
    const { userId } = req.user;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    
    // 查询总记录数
    const total = await AnswerRecord.count({ 
      where: { user_id: userId } 
    });
    
    // 查询记录列表
    const records = await AnswerRecord.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Question,
          as: 'question',
          attributes: ['id', 'title', 'answer', 'analysis']
        }
      ],
      order: [['created_at', 'DESC']],
      offset,
      limit: pageSize
    });
    
    // 处理返回数据
    const list = records.map(record => ({
      id: record.id,
      questionId: record.question_id,
      title: record.question ? record.question.title : '题目已删除',
      userAnswer: record.user_answer,
      correctAnswer: record.question ? record.question.answer : '',
      isCorrect: record.is_correct,
      earnedPoints: record.earned_points,
      answerTime: record.answer_time,
      answerDate: record.created_at
    }));
    
    return response.success(res, {
      total,
      page,
      pageSize,
      list
    });
  } catch (error) {
    logger.error('获取答题历史失败:', error);
    return response.serverError(res, '获取答题历史失败');
  }
};

/**
 * 获取题目分类列表
 */
const getCategoryList = async (req, res) => {
  try {
    const categories = await Category.findAll({
      attributes: ['id', 'name', 'description', 'icon'],
      order: [['sort_order', 'ASC']]
    });
    
    return response.success(res, categories);
  } catch (error) {
    logger.error('获取题目分类失败:', error);
    return response.serverError(res, '获取题目分类失败');
  }
};

/**
 * 批量提交答题结果
 */
const submitQuizResults = async (req, res) => {
  try {
    // 获取用户ID
    const userId = req.user ? req.user.user_id : 1;
    const { userAnswers, totalEarnedPoints, correctCount, totalQuestions, quizDuration } = req.body;
    
    logger.info(`=== 用户 ${userId} 批量提交答题结果 ===`);
    logger.info(`答题记录数: ${userAnswers?.length}, 总获得积分: ${totalEarnedPoints}, 答对题数: ${correctCount}`);
    
    // 验证输入
    if (!userAnswers || !Array.isArray(userAnswers) || userAnswers.length === 0) {
      logger.warn('答题记录为空或格式错误:', { userAnswers });
      return response.badRequest(res, '答题记录不能为空');
    }
    
    if (typeof totalEarnedPoints !== 'number' || totalEarnedPoints < 0) {
      logger.warn('总积分格式错误:', { totalEarnedPoints });
      return response.badRequest(res, '总积分格式错误');
    }
    
    // 获取用户信息
    let user = await User.findByPk(userId);
    
    if (!user) {
      logger.info(`用户不存在，创建新用户: ${userId}`);
      user = await User.create({
        id: userId,
        nickname: '答题用户',
        avatar_url: '',
        total_points: 0,
        status: 1
      });
    }
    
    const oldPoints = user.total_points;
    
    // 开始事务处理
    const transaction = await sequelize.transaction();
    
    try {
      // 1. 批量创建答题记录
      const answerRecords = userAnswers.map(answer => ({
        user_id: userId,
        question_id: answer.questionId,
        user_answer: answer.selectedAnswer,
        is_correct: answer.isCorrect,
        answer_time: answer.answerTime || 0,
        earned_points: answer.earnedPoints || 0
      }));
      
      await AnswerRecord.bulkCreate(answerRecords, { transaction });
      logger.info(`批量创建答题记录成功: ${answerRecords.length} 条`);
      
      // 2. 更新用户总积分
      let finalUserPoints = oldPoints;
      if (totalEarnedPoints > 0) {
        // 使用 increment 原子操作更新用户积分
        await User.increment(
          { total_points: totalEarnedPoints }, 
          { where: { id: userId }, transaction }
        );
        // user.reload({ transaction }); // increment 不更新实例，reload 是需要的，或者计算最终值
        finalUserPoints = oldPoints + totalEarnedPoints;
        logger.info(`用户积分更新: ${oldPoints} -> ${finalUserPoints} (+${totalEarnedPoints})`);
      } else {
        logger.info(`本次答题未获得积分，积分保持: ${oldPoints}`);
      }
      
      // 3. 触发统计更新（异步，不影响主业务）
      try {
        if (typeof StatsEventTrigger !== 'undefined' && StatsEventTrigger.onBatchAnswerComplete) {
          // 将 userAnswers 传递给 onBatchAnswerComplete，它内部会处理 isCorrect
          StatsEventTrigger.onBatchAnswerComplete(userId, userAnswers); 
        }
      } catch (statsError) {
        logger.warn('统计更新失败:', statsError);
      }
      
      // 提交事务
      await transaction.commit();
      
      // 更新 Redis 缓存中的用户信息
      if (redisClient && typeof redisClient.setUser === 'function') {
        try {
          // user.toJSON() 中的 total_points 此时是旧的，因为 increment 不直接更新实例
          // 我们需要使用计算后的 finalUserPoints
          const userObjectForCache = user.toJSON(); 
          userObjectForCache.total_points = finalUserPoints; // 使用事务结束后计算的最终积分

          await redisClient.setUser(user.id, userObjectForCache);
          logger.info(`用户 ${user.id} 的Redis缓存已更新 (积分: ${finalUserPoints})`);
        } catch (redisError) {
          logger.error(`更新用户 ${user.id} 的Redis缓存失败:`, redisError);
        }
      }
      
      // 返回结果
      const result = {
        success: true,
        totalEarnedPoints,
        userPoints: finalUserPoints, // 返回最新的积分
        correctCount,
        totalQuestions,
        recordsCreated: answerRecords.length
      };
      
      logger.info(`=== 批量答题结果处理完成 ===`, result);
      
      return response.success(res, result);
      
    } catch (error) {
      // 回滚事务
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    logger.error('批量提交答题结果失败:', error);
    logger.error('错误堆栈:', error.stack);
    return response.serverError(res, '提交答题结果失败');
  }
};

module.exports = {
  getRandomQuestion,
  getRandomQuestions,
  submitAnswer,
  getAnswerHistory,
  getCategoryList,
  submitQuizResults
}; 