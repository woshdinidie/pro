/**
 * 统一API响应工具
 */
const responseUtil = {
  /**
   * 成功响应
   * @param {Object} res - Express响应对象
   * @param {Any} data - 响应数据
   * @param {String} msg - 响应消息
   * @returns {Object} 响应对象
   */
  success: (res, data = null, msg = 'success') => {
    return res.status(200).json({
      code: 0,
      msg,
      data
    });
  },

  /**
   * 错误请求响应 (400)
   * @param {Object} res - Express响应对象
   * @param {String} msg - 错误消息
   * @returns {Object} 响应对象
   */
  badRequest: (res, msg = '请求参数错误') => {
    return res.status(400).json({
      code: 400,
      msg,
      data: null
    });
  },

  /**
   * 未授权响应 (401)
   * @param {Object} res - Express响应对象
   * @param {String} msg - 错误消息
   * @returns {Object} 响应对象
   */
  unauthorized: (res, msg = '请先登录') => {
    return res.status(401).json({
      code: 401,
      msg,
      data: null
    });
  },

  /**
   * 禁止访问响应 (403)
   * @param {Object} res - Express响应对象
   * @param {String} msg - 错误消息
   * @returns {Object} 响应对象
   */
  forbidden: (res, msg = '没有操作权限') => {
    return res.status(403).json({
      code: 403,
      msg,
      data: null
    });
  },

  /**
   * 资源不存在响应 (404)
   * @param {Object} res - Express响应对象
   * @param {String} msg - 错误消息
   * @returns {Object} 响应对象
   */
  notFound: (res, msg = '请求的资源不存在') => {
    return res.status(404).json({
      code: 404,
      msg,
      data: null
    });
  },

  /**
   * 服务器错误响应 (500)
   * @param {Object} res - Express响应对象
   * @param {String} msg - 错误消息
   * @returns {Object} 响应对象
   */
  serverError: (res, msg = '服务器内部错误') => {
    return res.status(500).json({
      code: 500,
      msg,
      data: null
    });
  }
};

module.exports = responseUtil; 