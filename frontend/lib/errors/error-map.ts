/**
 * 错误映射配置
 * 
 * 定义了错误类型到元数据的映射关系，包括错误分类、严重程度、国际化 key 等
 */

import { ErrorCategory, ErrorSeverity, type ErrorMapping } from './types';

/**
 * 错误类型映射表
 * 
 * 将后端返回的 error 字段映射到前端的错误元数据
 */
export const ERROR_MAP: Record<string, ErrorMapping> = {
  // ===== 网络错误 =====
  'network_error': {
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.ERROR,
    i18nKey: 'errors.network_error',
    retryable: true,
    actionable: true
  },
  'timeout': {
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.WARNING,
    i18nKey: 'errors.timeout',
    retryable: true,
    actionable: true
  },
  
  // ===== 认证错误 =====
  'unauthorized': {
    category: ErrorCategory.AUTH,
    severity: ErrorSeverity.ERROR,
    i18nKey: 'errors.unauthorized',
    retryable: false,
    actionable: true
  },
  'token_expired': {
    category: ErrorCategory.AUTH,
    severity: ErrorSeverity.WARNING,
    i18nKey: 'errors.token_expired',
    retryable: false,
    actionable: true
  },
  
  // ===== 权限错误 =====
  'forbidden': {
    category: ErrorCategory.PERMISSION,
    severity: ErrorSeverity.ERROR,
    i18nKey: 'errors.forbidden',
    retryable: false,
    actionable: false
  },
  
  // ===== 验证错误 =====
  'validation_error': {
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.WARNING,
    i18nKey: 'errors.validation_error',
    retryable: false,
    actionable: true
  },
  'bad_request': {
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.WARNING,
    i18nKey: 'errors.bad_request',
    retryable: false,
    actionable: true
  },
  
  // ===== 业务错误 =====
  'not_found': {
    category: ErrorCategory.BUSINESS,
    severity: ErrorSeverity.WARNING,
    i18nKey: 'errors.not_found',
    retryable: false,
    actionable: false
  },
  'quota_exceeded': {
    category: ErrorCategory.BUSINESS,
    severity: ErrorSeverity.ERROR,
    i18nKey: 'errors.quota_exceeded',
    retryable: false,
    actionable: true
  },
  'method_not_allowed': {
    category: ErrorCategory.BUSINESS,
    severity: ErrorSeverity.WARNING,
    i18nKey: 'errors.method_not_allowed',
    retryable: false,
    actionable: false
  },
  'conflict': {
    category: ErrorCategory.BUSINESS,
    severity: ErrorSeverity.WARNING,
    i18nKey: 'errors.conflict',
    retryable: true,
    actionable: true
  },
  'rate_limit_exceeded': {
    category: ErrorCategory.BUSINESS,
    severity: ErrorSeverity.WARNING,
    i18nKey: 'errors.rate_limit_exceeded',
    retryable: true,
    actionable: true
  },
  
  // ===== 服务器错误 =====
  'internal_server_error': {
    category: ErrorCategory.SERVER,
    severity: ErrorSeverity.CRITICAL,
    i18nKey: 'errors.server_error',
    retryable: true,
    actionable: true
  },
  'service_unavailable': {
    category: ErrorCategory.SERVER,
    severity: ErrorSeverity.CRITICAL,
    i18nKey: 'errors.service_unavailable',
    retryable: true,
    actionable: true
  },
  'bad_gateway': {
    category: ErrorCategory.SERVER,
    severity: ErrorSeverity.CRITICAL,
    i18nKey: 'errors.bad_gateway',
    retryable: true,
    actionable: true
  },
  'gateway_timeout': {
    category: ErrorCategory.SERVER,
    severity: ErrorSeverity.CRITICAL,
    i18nKey: 'errors.gateway_timeout',
    retryable: true,
    actionable: true
  },
  
  // ===== 聊天助手系统错误 =====
  // 助手相关错误
  'assistant_not_found': {
    category: ErrorCategory.BUSINESS,
    severity: ErrorSeverity.WARNING,
    i18nKey: 'chat.errors.assistant_not_found',
    retryable: false,
    actionable: false
  },
  'assistant_archived': {
    category: ErrorCategory.BUSINESS,
    severity: ErrorSeverity.WARNING,
    i18nKey: 'chat.errors.assistant_archived',
    retryable: false,
    actionable: false
  },
  
  // 会话相关错误
  'conversation_not_found': {
    category: ErrorCategory.BUSINESS,
    severity: ErrorSeverity.WARNING,
    i18nKey: 'chat.errors.conversation_not_found',
    retryable: false,
    actionable: false
  },
  'conversation_archived': {
    category: ErrorCategory.BUSINESS,
    severity: ErrorSeverity.WARNING,
    i18nKey: 'chat.errors.conversation_archived',
    retryable: false,
    actionable: false
  },
  
  // 消息相关错误
  'message_send_failed': {
    category: ErrorCategory.BUSINESS,
    severity: ErrorSeverity.ERROR,
    i18nKey: 'chat.errors.message_send_failed',
    retryable: true,
    actionable: true
  },
  'run_execution_failed': {
    category: ErrorCategory.BUSINESS,
    severity: ErrorSeverity.ERROR,
    i18nKey: 'chat.errors.run_execution_failed',
    retryable: true,
    actionable: true
  },
  
  // 评测相关错误
  'eval_not_enabled': {
    category: ErrorCategory.BUSINESS,
    severity: ErrorSeverity.WARNING,
    i18nKey: 'chat.errors.eval_not_enabled',
    retryable: false,
    actionable: true
  },
  'eval_cooldown': {
    category: ErrorCategory.BUSINESS,
    severity: ErrorSeverity.WARNING,
    i18nKey: 'chat.errors.eval_cooldown',
    retryable: true,
    actionable: false
  },
  'eval_not_found': {
    category: ErrorCategory.BUSINESS,
    severity: ErrorSeverity.WARNING,
    i18nKey: 'chat.errors.eval_not_found',
    retryable: false,
    actionable: false
  },
  'invalid_reason_tags': {
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.WARNING,
    i18nKey: 'chat.errors.invalid_reason_tags',
    retryable: false,
    actionable: true
  },
  
  // 配置相关错误
  'invalid_config': {
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.WARNING,
    i18nKey: 'chat.errors.invalid_config',
    retryable: false,
    actionable: true
  },
  'empty_candidate_models': {
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.WARNING,
    i18nKey: 'chat.errors.empty_candidate_models',
    retryable: false,
    actionable: true
  },
  'invalid_max_challengers': {
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.WARNING,
    i18nKey: 'chat.errors.invalid_max_challengers',
    retryable: false,
    actionable: true
  },
  'project_ai_config_incomplete': {
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.WARNING,
    i18nKey: 'chat.errors.project_ai_config_incomplete',
    retryable: false,
    actionable: true
  }
};

/**
 * HTTP 状态码到错误类型的映射
 * 
 * 当后端没有返回标准错误格式时，根据状态码推断错误类型
 */
export const STATUS_CODE_MAP: Record<number, string> = {
  400: 'bad_request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  405: 'method_not_allowed',
  408: 'timeout',
  409: 'conflict',
  422: 'validation_error',
  429: 'rate_limit_exceeded',
  500: 'internal_server_error',
  502: 'bad_gateway',
  503: 'service_unavailable',
  504: 'gateway_timeout'
};

/**
 * 根据 HTTP 状态码获取错误分类
 */
export function categorizeByStatus(status: number): ErrorCategory {
  if (status === 401) return ErrorCategory.AUTH;
  if (status === 403) return ErrorCategory.PERMISSION;
  if (status >= 400 && status < 500) return ErrorCategory.VALIDATION;
  if (status >= 500) return ErrorCategory.SERVER;
  if (status === 0) return ErrorCategory.NETWORK;
  return ErrorCategory.UNKNOWN;
}

/**
 * 根据 HTTP 状态码获取错误严重程度
 */
export function severityByStatus(status: number): ErrorSeverity {
  if (status >= 500) return ErrorSeverity.CRITICAL;
  if (status === 401 || status === 403) return ErrorSeverity.ERROR;
  if (status >= 400 && status < 500) return ErrorSeverity.WARNING;
  if (status === 0) return ErrorSeverity.ERROR;
  return ErrorSeverity.INFO;
}