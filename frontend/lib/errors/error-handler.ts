/**
 * 错误处理工具类
 * 
 * 提供错误标准化、分类和转换功能
 */

import type { AxiosError } from 'axios';
import { StandardError, ErrorCategory, ErrorSeverity } from './types';
import { ERROR_MAP, STATUS_CODE_MAP, categorizeByStatus, severityByStatus } from './error-map';

export class ErrorHandler {
  /**
   * 将任意错误转换为标准错误对象
   * 
   * @param error - 原始错误对象
   * @returns 标准化的错误对象
   */
  static normalize(error: unknown): StandardError {
    // 已经是标准错误
    if (this.isStandardError(error)) {
      return error as StandardError;
    }

    // Axios 错误
    if (this.isAxiosError(error)) {
      return this.fromAxiosError(error);
    }

    // 普通 Error 对象
    if (error instanceof Error) {
      return this.fromError(error);
    }

    // 未知错误
    return this.fromUnknown(error);
  }

  /**
   * 从 Axios 错误创建标准错误
   */
  private static fromAxiosError(error: AxiosError): StandardError {
    const response = error.response;
    const data = response?.data as any;

    // 后端返回的标准错误格式 (符合 backend/app/errors.py 的 ErrorResponse)
    if (data?.error && data?.message && typeof data?.code === 'number') {
      const errorType = data.error;
      const mapping = ERROR_MAP[errorType];
      
      if (mapping) {
        return {
          error: errorType,
          message: data.message,
          code: data.code,
          details: data.details,
          category: mapping.category,
          severity: mapping.severity,
          i18nKey: mapping.i18nKey,
          retryable: mapping.retryable,
          actionable: mapping.actionable
        };
      }
    }

    // 根据状态码推断错误类型
    const statusCode = response?.status || 0;
    const errorType = STATUS_CODE_MAP[statusCode] || 'unknown_error';
    const mapping = ERROR_MAP[errorType];

    // 尝试从响应中提取错误消息
    let message = error.message || '请求失败';
    if (data?.detail) {
      message = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
    } else if (data?.message) {
      message = data.message;
    }

    return {
      error: errorType,
      message,
      code: statusCode,
      details: data,
      category: mapping?.category || categorizeByStatus(statusCode),
      severity: mapping?.severity || severityByStatus(statusCode),
      i18nKey: mapping?.i18nKey,
      retryable: mapping?.retryable ?? (statusCode >= 500 || statusCode === 408 || statusCode === 429),
      actionable: mapping?.actionable ?? (statusCode >= 400 && statusCode < 500)
    };
  }

  /**
   * 从普通 Error 创建标准错误
   */
  private static fromError(error: Error): StandardError {
    // 检查是否是网络错误
    const isNetworkError = error.message.toLowerCase().includes('network') ||
                          error.message.toLowerCase().includes('fetch');

    return {
      error: isNetworkError ? 'network_error' : 'client_error',
      message: error.message,
      code: 0,
      category: isNetworkError ? ErrorCategory.NETWORK : ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.ERROR,
      i18nKey: isNetworkError ? 'errors.network_error' : 'errors.client_error',
      retryable: isNetworkError,
      actionable: true
    };
  }

  /**
   * 从未知错误创建标准错误
   */
  private static fromUnknown(error: unknown): StandardError {
    return {
      error: 'unknown_error',
      message: String(error),
      code: 0,
      category: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.ERROR,
      i18nKey: 'errors.unknown_error',
      retryable: false,
      actionable: false
    };
  }

  /**
   * 获取用户友好的错误消息
   * 
   * @param error - 标准错误对象
   * @param t - 国际化翻译函数
   * @returns 用户友好的错误消息
   */
  static getUserMessage(error: StandardError, t: (key: string) => string): string {
    // 优先使用国际化消息
    if (error.i18nKey) {
      const translated = t(error.i18nKey);
      // 如果翻译成功（返回值不等于 key），使用翻译结果
      if (translated !== error.i18nKey) {
        return translated;
      }
    }

    // 使用预设的用户消息
    if (error.userMessage) {
      return error.userMessage;
    }

    // 根据错误类别返回通用消息
    const categoryKey = `errors.${error.category}_generic`;
    const categoryMessage = t(categoryKey);
    if (categoryMessage !== categoryKey) {
      return categoryMessage;
    }

    // 最后的兜底：使用原始消息或通用错误消息
    return error.message || t('errors.generic');
  }

  /**
   * 获取错误提示文本（用于 toast description）
   * 
   * @param error - 标准错误对象
   * @param t - 国际化翻译函数
   * @returns 错误提示文本，如果没有则返回 undefined
   */
  static getHintMessage(error: StandardError, t: (key: string) => string): string | undefined {
    // 从 details 中获取提示
    if (error.details?.hint) {
      const hintKey = error.details.hint;
      const translated = t(hintKey);
      if (translated !== hintKey) {
        return translated;
      }
    }

    // 根据错误类型提供默认提示
    if (error.retryable) {
      return t('errors.hint_retry');
    }

    if (error.actionable && error.category === ErrorCategory.VALIDATION) {
      return t('errors.hint_check_input');
    }

    if (error.category === ErrorCategory.PERMISSION) {
      return t('errors.hint_permission');
    }

    return undefined;
  }

  /**
   * 类型守卫：检查是否为标准错误
   */
  private static isStandardError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'error' in error &&
      'message' in error &&
      'code' in error &&
      'category' in error &&
      'severity' in error
    );
  }

  /**
   * 类型守卫：检查是否为 Axios 错误
   */
  private static isAxiosError(error: unknown): error is AxiosError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'isAxiosError' in error &&
      (error as any).isAxiosError === true
    );
  }

  /**
   * 判断错误是否可重试
   */
  static isRetryable(error: StandardError): boolean {
    return error.retryable === true;
  }

  /**
   * 判断错误是否需要用户操作
   */
  static isActionable(error: StandardError): boolean {
    return error.actionable === true;
  }

  /**
   * 判断是否为认证错误
   */
  static isAuthError(error: StandardError): boolean {
    return error.category === ErrorCategory.AUTH;
  }

  /**
   * 判断是否为权限错误
   */
  static isPermissionError(error: StandardError): boolean {
    return error.category === ErrorCategory.PERMISSION;
  }

  /**
   * 判断是否为网络错误
   */
  static isNetworkError(error: StandardError): boolean {
    return error.category === ErrorCategory.NETWORK;
  }

  /**
   * 判断是否为服务器错误
   */
  static isServerError(error: StandardError): boolean {
    return error.category === ErrorCategory.SERVER;
  }
}

/**
 * 获取用户友好的错误消息（简化版本，不依赖国际化）
 * 
 * @param error - 任意错误对象
 * @returns 用户友好的错误消息
 */
export function getErrorMessage(error: any): string {
  // 标准化错误
  const standardError = ErrorHandler.normalize(error);
  
  // 特定错误码的友好提示映射
  const errorMessages: Record<string, string> = {
    // 资源不存在错误
    'not_found': '资源不存在或无权访问',
    'project_not_found': '项目不存在或无权访问，请检查项目选择',
    'conversation_not_found': '会话已删除或归档',
    'assistant_not_found': '助手不存在或已删除',
    'eval_not_found': '评测不存在',
    
    // 权限错误
    'forbidden': '无权访问该资源',
    'unauthorized': '未授权，请先登录',
    
    // 评测相关错误
    'PROJECT_EVAL_DISABLED': '该项目未启用推荐评测',
    'eval_not_enabled': '该项目未启用推荐评测',
    'PROJECT_EVAL_COOLDOWN': '评测太频繁，请稍后再试',
    'eval_cooldown': '评测太频繁，请稍后再试',
    'PROJECT_EVAL_BUDGET_EXCEEDED': '项目预算不足，无法触发评测',
    
    // 验证错误
    'validation_error': '请求参数验证失败',
    'bad_request': '请求参数错误',
    
    // 归档相关错误
    'conversation_archived': '会话已归档，无法继续对话',
    'assistant_archived': '助手已归档',
    
    // 网络错误
    'network_error': '网络连接失败，请检查网络',
    'timeout': '请求超时，请重试',
    
    // 服务器错误
    'internal_server_error': '服务器内部错误，请稍后重试',
    'service_unavailable': '服务暂时不可用，请稍后重试',
    'bad_gateway': '网关错误，请稍后重试',
    'gateway_timeout': '网关超时，请稍后重试',
    
    // 业务错误
    'rate_limit_exceeded': '请求太频繁，请稍后再试',
    'quota_exceeded': '配额已用尽',
    'method_not_allowed': '不支持的操作方法',
    'conflict': '资源冲突，请刷新后重试',
    
    // 消息相关错误
    'message_send_failed': '消息发送失败，请重试',
    'run_execution_failed': '执行失败，请重试',
    
    // 配置相关错误
    'invalid_config': '配置无效',
    'empty_candidate_models': '候选模型列表为空',
    'invalid_max_challengers': '挑战者数量无效',
    'project_ai_config_incomplete': '项目 AI 配置不完整',
    'invalid_reason_tags': '原因标签无效',
  };
  
  // 优先使用映射的友好消息
  if (standardError.error) {
    const mappedMessage = errorMessages[standardError.error];
    if (mappedMessage) {
      return mappedMessage;
    }
  }
  
  // 使用标准错误的消息
  if (standardError.message) {
    return standardError.message;
  }
  
  // 最后的兜底
  return '操作失败，请重试';
}
