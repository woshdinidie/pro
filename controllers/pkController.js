const { User, Question, MatchRecord, sequelize } = require('../models');
const logger = require('../utils/logger');
const StatsEventTrigger = require('../utils/statsEventTrigger');
const redisClient = require('../utils/redis');

/**
 * 获取PK统计信息
 */
const getPkSummary = async (req, res) => {
  try {
    const { user_id } = req.user;
    
    // 获取今日PK次数
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayPkCount = await MatchRecord.count({
      where: {
        user_id: user_id,
        created_at: {
          [require('sequelize').Op.gte]: today,
          [require('sequelize').Op.lt]: tomorrow
        }
      }
    });
    
    // 计算剩余次数（测试阶段：无限制）
    const remainingChances = 999; // 测试阶段设置为999
    
    // 获取总PK统计
    const totalPkCount = await MatchRecord.count({
      where: { user_id: user_id }
    });
    
    const winCount = await MatchRecord.count({
      where: { 
        user_id: user_id,
        result: 1 // 1表示胜利
      }
    });
    
    const winRate = totalPkCount > 0 ? Math.round((winCount / totalPkCount) * 100) : 0;
    
    res.json({
      code: 0,
      message: '获取PK统计成功',
      data: {
        remainingChances: remainingChances,
        todayPkCount: todayPkCount,
        totalPkCount: totalPkCount,
        winCount: winCount,
        winRate: winRate
      }
    });
    
  } catch (error) {
    logger.error('获取PK统计失败:', error);
    res.json({
      code: 500,
      message: '获取PK统计失败',
      data: null
    });
  }
};

/**
 * 创建PK对战
 */
const createMatch = async (req, res) => {
  try {
    const { user_id } = req.user;
    
    // 检查用户积分
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.json({
        code: 404,
        message: '用户不存在',
        data: null
      });
    }
    
    if (user.total_points < 2) {
      return res.json({
        code: 400,
        message: '积分不足，需要2积分参与PK',
        data: null
      });
    }
    
    // 检查今日PK次数（测试阶段：暂时取消限制）
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayPkCount = await MatchRecord.count({
      where: {
        user_id: user_id,
        created_at: {
          [require('sequelize').Op.gte]: today,
          [require('sequelize').Op.lt]: tomorrow
        }
      }
    });
    
    // 测试阶段：注释掉次数限制
    // if (todayPkCount >= 5) {
    //   return res.json({
    //     code: 400,
    //     message: '今日PK次数已用完',
    //     data: null
    //   });
    // }
    
    // 扣除积分
    const entryFee = 2;
    const newTotalPoints = user.total_points - entryFee;
    await user.update({
      total_points: newTotalPoints
    });

    // 更新Redis缓存中的用户信息
    if (redisClient && typeof redisClient.setUser === 'function') {
      try {
        const userStateForCache = {
          ...user.toJSON(), 
          total_points: newTotalPoints 
        };
        await redisClient.setUser(user.id, userStateForCache);
        logger.info(`用户 ${user.id} 的Redis缓存因PK创建已更新 (新积分: ${newTotalPoints})`);
      } catch (redisError) {
        logger.error(`更新用户 ${user.id} 的Redis缓存失败 (PK创建):`, redisError);
      }
    }
    
    // 创建对战记录
    const matchRecord = await MatchRecord.create({
      user_id: user_id,
      user_score: 0,
      opponent_score: 0,
      total_questions: 5,
      current_question: 0,
      status: 'playing', // playing, finished
      result: null, // 0-失败 1-胜利 2-平局
      points_earned: 0
    });
    
    logger.info(`用户 ${user_id} 创建PK对战: ${matchRecord.id}`);
    
    res.json({
      code: 0,
      message: '创建对战成功',
      data: {
        match_id: matchRecord.id,
        remaining_points: user.total_points,
        remaining_pk_chances: 999 // 测试阶段：无限制
      }
    });
    
  } catch (error) {
    logger.error('创建PK对战失败:', error);
    res.json({
      code: 500,
      message: '创建对战失败',
      data: null
    });
  }
};

/**
 * 获取PK题目
 */
const getMatchQuestion = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { question_index = 0 } = req.query;
    const { user_id } = req.user;
    
    logger.info(`获取PK题目: matchId=${matchId}, questionIndex=${question_index}, userId=${user_id}`);
    
    // 验证对战记录
    const matchRecord = await MatchRecord.findOne({
      where: {
        id: matchId,
        user_id: user_id,
        status: 'playing'
      }
    });
    
    if (!matchRecord) {
      return res.json({
        code: 404,
        message: '对战记录不存在或已结束',
        data: null
      });
    }
    
    // 获取随机题目
    const question = await Question.findOne({
      order: require('sequelize').literal('RAND()'),
      attributes: ['id', 'title', 'options', 'answer', 'analysis']
    });
    
    if (!question) {
      logger.error('没有找到可用的题目');
      return res.json({
        code: 404,
        message: '没有可用的题目',
        data: null
      });
    }
    
    logger.info(`成功获取题目: ${question.id}`);
    
    // 解析JSON格式的选项
    const options = JSON.parse(question.options);
    
    res.json({
      code: 0,
      message: '获取题目成功',
      data: {
        questionId: question.id,
        title: question.title,
        options: options,
        questionIndex: parseInt(question_index),
        totalQuestions: matchRecord.total_questions
      }
    });
    
  } catch (error) {
    logger.error('获取PK题目失败:', error);
    res.json({
      code: 500,
      message: '获取题目失败',
      data: null
    });
  }
};

/**
 * 提交PK答案
 */
const submitMatchAnswer = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { questionId, answer, answerTime, questionIndex } = req.body;
    const { user_id } = req.user;
    
    // 验证对战记录
    const matchRecord = await MatchRecord.findOne({
      where: {
        id: matchId,
        user_id: user_id,
        status: 'playing'
      }
    });
    
    if (!matchRecord) {
      return res.json({
        code: 404,
        message: '对战记录不存在或已结束',
        data: null
      });
    }
    
    // 获取题目信息
    const question = await Question.findByPk(questionId);
    if (!question) {
      return res.json({
        code: 404,
        message: '题目不存在',
        data: null
      });
    }
    
    // 判断答案是否正确
    const isCorrect = answer === question.answer;
    
    // 更新用户得分
    let newUserScore = matchRecord.user_score;
    if (isCorrect) {
      newUserScore += 1;
    }
    
    // 模拟对手得分（控制机器人每题答对概率）
    let newOpponentScore = matchRecord.opponent_score;
    // 对手答题逻辑：根据题目难度和随机因素决定是否答对
    const opponentCorrectRate = 0.5; // 对手50%正确率 (每题)
    const opponentIsCorrect = Math.random() < opponentCorrectRate;
    if (opponentIsCorrect) {
      newOpponentScore += 1;
    }
    
    // 更新对战记录
    const currentQuestion = questionIndex + 1;
    const isFinished = currentQuestion >= matchRecord.total_questions;
    
    let result = null;
    let pointsEarned = 0;
    let userFinalTotalPoints = null; // 用于存储用户最终的总积分
    
    if (isFinished) {
      // 判断胜负
      if (newUserScore > newOpponentScore) {
        result = 1; // 胜利
        pointsEarned = 4;
      } else if (newUserScore < newOpponentScore) {
        result = 0; // 失败
        pointsEarned = 0;
      } else {
        result = 2; // 平局
        pointsEarned = 0;
      }
      
      // 更新用户积分
      const user = await User.findByPk(user_id); // 获取当前用户对象
      let finalPointsAfterMatch = user.total_points; // 默认为当前积分

      if (pointsEarned > 0) {
        finalPointsAfterMatch = user.total_points + pointsEarned;
        await user.update({
          total_points: finalPointsAfterMatch
        });
      }
      // 此时 user.total_points 可能还是旧值，或者已被 update 方法更新（取决于 Sequelize 版本和配置）
      // 最安全的是使用 finalPointsAfterMatch

      // Cache the final state.
      if (redisClient && typeof redisClient.setUser === 'function') {
        try {
          // 构建一个用于缓存的纯对象，确保 total_points 是最新的
          const userStateForCache = {
            ...user.toJSON(), // 获取用户对象的其他属性
            total_points: finalPointsAfterMatch // 显式使用结算后的积分
          };
          logger.info(`准备更新用户 ${user.id} 的Redis缓存 (PK结算), 缓存内容: ${JSON.stringify(userStateForCache)}`);
          await redisClient.setUser(user.id, userStateForCache); 
          logger.info(`用户 ${user.id} 的Redis缓存因PK结算已更新 (使用积分: ${userStateForCache.total_points})`);
        } catch (redisError) {
          logger.error(`更新用户 ${user.id} 的Redis缓存失败 (PK结算):`, redisError);
        }
      }
      
      userFinalTotalPoints = finalPointsAfterMatch; // 获取结算后的用户总积分

      // 🚀 新增：PK完成时触发统计更新（异步，不影响主业务）
      StatsEventTrigger.onPKComplete(user_id, result);
    }
    
    await matchRecord.update({
      user_score: newUserScore,
      opponent_score: newOpponentScore,
      current_question: currentQuestion,
      status: isFinished ? 'finished' : 'playing',
      result: result,
      points_earned: pointsEarned
    });
    
    logger.info(`用户 ${user_id} 提交PK答案: 题目${questionId}, 答案${answer}, 正确${isCorrect}`);
    
    res.json({
      code: 0,
      message: '提交答案成功',
      data: {
        is_correct: isCorrect,
        correct_answer: question.answer,
        analysis: question.analysis,
        user_score: newUserScore,
        opponent_score: newOpponentScore,
        is_finished: isFinished,
        result: result,
        points_earned: pointsEarned,
        user_total_points: userFinalTotalPoints, // 返回用户最新的总积分
        next_question_index: isFinished ? null : currentQuestion
      }
    });
    
  } catch (error) {
    logger.error('提交PK答案失败:', error);
    res.json({
      code: 500,
      message: '提交答案失败',
      data: null
    });
  }
};

/**
 * 获取PK历史记录
 */
const getPkHistory = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { page = 1, pageSize = 10 } = req.query;
    
    const offset = (page - 1) * pageSize;
    
    const { count, rows } = await MatchRecord.findAndCountAll({
      where: { user_id: user_id },
      order: [['created_at', 'DESC']],
      limit: parseInt(pageSize),
      offset: offset
    });
    
    const records = rows.map(record => ({
      id: record.id,
      userScore: record.user_score,
      opponentScore: record.opponent_score,
      result: record.result,
      pointsEarned: record.points_earned,
      createdAt: record.created_at
    }));
    
    res.json({
      code: 0,
      message: '获取PK历史成功',
      data: {
        records: records,
        total: count,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
    
  } catch (error) {
    logger.error('获取PK历史失败:', error);
    res.json({
      code: 500,
      message: '获取PK历史失败',
      data: null
    });
  }
};

module.exports = {
  getPkSummary,
  createMatch,
  getMatchQuestion,
  submitMatchAnswer,
  getPkHistory
}; 