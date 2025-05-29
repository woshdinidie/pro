const { Match, User, Question, AnswerRecord } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

// 创建PK对战
exports.createMatch = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { category_id, difficulty } = req.body;

    // 检查用户积分是否足够（入场费2积分）
    const user = await User.findByPk(user_id);
    if (!user || user.total_points < 2) {
      return res.json({
        code: 400,
        message: '积分不足，无法参与PK对战',
        data: null
      });
    }

    // 扣除入场积分
    await user.update({
      total_points: user.total_points - 2
    });

    // 创建对战记录
    const match = await Match.create({
      user_id,
      is_robot: 1, // 设置为机器人对战
      status: 1, // 进行中
      category_id,
      difficulty,
      started_at: new Date()
    });

    return res.json({
      code: 200,
      message: '创建对战成功',
      data: {
        match_id: match.id
      }
    });
  } catch (error) {
    logger.error('创建对战失败:', error);
    return res.json({
      code: 500,
      message: '服务器错误',
      data: null
    });
  }
};

// 获取PK题目
exports.getMatchQuestion = async (req, res) => {
  try {
    const { match_id } = req.params;
    const { user_id } = req.user;

    const match = await Match.findOne({
      where: {
        id: match_id,
        user_id,
        status: 1
      }
    });

    if (!match) {
      return res.json({
        code: 404,
        message: '对战不存在或已结束',
        data: null
      });
    }

    // 随机获取一道题目
    const question = await Question.findOne({
      where: {
        category_id: match.category_id,
        difficulty: match.difficulty,
        status: 1
      },
      order: sequelize.random()
    });

    if (!question) {
      return res.json({
        code: 404,
        message: '没有找到合适的题目',
        data: null
      });
    }

    return res.json({
      code: 200,
      message: '获取题目成功',
      data: {
        question
      }
    });
  } catch (error) {
    logger.error('获取PK题目失败:', error);
    return res.json({
      code: 500,
      message: '服务器错误',
      data: null
    });
  }
};

// 提交PK答案
exports.submitMatchAnswer = async (req, res) => {
  try {
    const { match_id } = req.params;
    const { user_id } = req.user;
    const { question_id, selected_option_id } = req.body;

    const match = await Match.findOne({
      where: {
        id: match_id,
        user_id,
        status: 1
      }
    });

    if (!match) {
      return res.json({
        code: 404,
        message: '对战不存在或已结束',
        data: null
      });
    }

    // 获取题目信息
    const question = await Question.findByPk(question_id, {
      include: ['options']
    });

    if (!question) {
      return res.json({
        code: 404,
        message: '题目不存在',
        data: null
      });
    }

    // 判断答案是否正确
    const isCorrect = question.options.find(opt => opt.id === selected_option_id)?.is_correct || false;

    // 记录用户答题
    await AnswerRecord.create({
      user_id,
      question_id,
      selected_option_id,
      is_correct: isCorrect,
      mode: 2, // PK模式
      match_id,
      points_earned: isCorrect ? 4 : 0, // 答对得4分
      answer_time: 0 // 这里可以添加实际答题时间
    });

    // 模拟机器人答题（50%概率答对）
    const robotIsCorrect = Math.random() > 0.5;

    // 更新对战分数
    if (isCorrect) match.user_score += 1;
    if (robotIsCorrect) match.opponent_score += 1;

    // 判断是否结束对战（这里假设10题结束）
    const totalQuestions = await AnswerRecord.count({
      where: { match_id }
    });

    if (totalQuestions >= 10) {
      match.status = 2; // 已完成
      match.ended_at = new Date();
      
      // 判断胜负
      if (match.user_score > match.opponent_score) {
        match.winner = user_id;
        match.points_earned = 4; // 胜利获得4积分
      } else if (match.user_score < match.opponent_score) {
        match.winner = 'robot';
        match.points_earned = 0;
      } else {
        match.winner = 'draw';
        match.points_earned = 0;
      }

      // 更新用户积分
      if (match.points_earned > 0) {
        await User.update(
          { total_points: sequelize.literal(`total_points + ${match.points_earned}`) },
          { where: { id: user_id } }
        );
      }
    }

    await match.save();

    return res.json({
      code: 200,
      message: '提交答案成功',
      data: {
        is_correct: isCorrect,
        robot_is_correct: robotIsCorrect,
        user_score: match.user_score,
        opponent_score: match.opponent_score,
        is_finished: match.status === 2,
        winner: match.winner,
        points_earned: match.points_earned
      }
    });
  } catch (error) {
    logger.error('提交PK答案失败:', error);
    return res.json({
      code: 500,
      message: '服务器错误',
      data: null
    });
  }
};

// 获取PK结果
exports.getMatchResult = async (req, res) => {
  try {
    const { match_id } = req.params;
    const { user_id } = req.user;

    const match = await Match.findOne({
      where: {
        id: match_id,
        user_id
      }
    });

    if (!match) {
      return res.json({
        code: 404,
        message: '对战不存在',
        data: null
      });
    }

    return res.json({
      code: 200,
      message: '获取结果成功',
      data: {
        match
      }
    });
  } catch (error) {
    logger.error('获取PK结果失败:', error);
    return res.json({
      code: 500,
      message: '服务器错误',
      data: null
    });
  }
}; 