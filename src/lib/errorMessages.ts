/**
 * 错误消息枚举
 * 用于统一管理项目中的提示信息
 */
export const ErrorMessages = {
  // 通用错误
  SERVER_ERROR: '服务器内部错误，请稍后再试',
  NETWORK_ERROR: '网络连接异常，请检查网络设置',
  TIMEOUT: '请求超时，请重试',

  // 用户注册相关
  REGISTER_FIELDS_REQUIRED: '用户名、邮箱和密码都是必填项',
  PASSWORD_TOO_SHORT: '密码长度至少为6位',
  USER_ALREADY_EXISTS: '用户名或邮箱已存在',
  REGISTER_FAILED: '注册失败，请检查输入信息',

  // 用户登录相关
  LOGIN_FIELDS_REQUIRED: '用户名和密码都是必填项',
  INVALID_CREDENTIALS: '用户名或密码错误',
  USER_NOT_FOUND: '用户不存在',
  WRONG_PASSWORD: '密码错误',
  LOGIN_FAILED: '登录失败，请重试',

  // 认证相关
  UNAUTHORIZED: '未登录或登录已过期，请重新登录',
  FORBIDDEN: '您没有权限进行此操作',

  // 聊天相关
  FETCH_HISTORY_FAILED: '获取聊天记录失败',
  SEND_MESSAGE_FAILED: '发送消息失败，请检查连接',
};

/**
 * 状态码与错误消息的映射（可选）
 */
export const StatusCodeMessages: Record<number, string> = {
  400: '请求参数错误',
  401: '未经授权的访问',
  403: '访问被拒绝',
  404: '资源不存在',
  409: ErrorMessages.USER_ALREADY_EXISTS,
  500: ErrorMessages.SERVER_ERROR,
};
