/**
 * 聊天助手系统错误处理工具
 * 
 * 提供聊天模块专用的错误处理函数和错误消息映射
 */

import { ErrorHandler } from './error-handler';
import type { StandardError } from './types';

/**
 * 聊天错误码常量
 */
export const CHAT_ERROR_CODES = {
  // 助手相关
  ASSISTANT_NOT_FOUND: 'assistant_not_found',
  ASSISTANT_ARCHIVED: 'assistant_archived',
  
  // 会话相关
  CONVERSATION_NOT_FOUND: 'conversation_not_found',
  CONVERSATION_ARCHIVED: 'conversation_archived',
  
  // 消息相关
  MESSAGE_SEND_FAILED: 'message_send_failed',
  RUN_EXECUTION_FAILED: 'run_execution_failed',
  
  // 评测相关
  EVAL_NOT_ENABLED: 'eval_not_enabled',
  EVAL_COOLDOWN: 'eval_cooldown',
  EVAL_NOT_FOUND: 'eval_not_found',
  INVALID_REASON_TAGS: 'invalid_reason_tags',
  
  // 配置相关
  INVALID_CONFIG: 'invalid_config',
  EMPTY_CANDIDATE_MODELS: 'empty_candidate_models',
  INVALID_MAX_CHALLENGERS: 'invalid_max_challengers',
  PROJECT_AI_CONFIG_INCOMPLETE: 'project_ai_config_incomplete',
} as const;

/**
 * 聊天错误类型
 */
export type ChatErrorCode = typeof CHAT_ERROR_CODES[keyof typeof CHAT_ERROR_CODES];

/**
 * 聊天错误处理器
 * 
 * 扩展通用错误处理器，提供聊天模块特定的错误处理逻辑
 */
export class ChatErrorHandler extends ErrorHandler {
  /**
   * 判断是否为助手相关错误
   */
  static isAssistantError(error: StandardError): boolean {
    const assistantErrors: string[] = [
      CHAT_ERROR_CODES.ASSISTANT_NOT_FOUND,
      CHAT_ERROR_CODES.ASSISTANT_ARCHIVED,
    ];
    return assistantErrors.includes(error.error);
  }

  /**
   * 判断是否为会话相关错误
   */
  static isConversationError(error: StandardError): boolean {
    const conversationErrors: string[] = [
      CHAT_ERROR_CODES.CONVERSATION_NOT_FOUND,
      CHAT_ERROR_CODES.CONVERSATION_ARCHIVED,
    ];
    return conversationErrors.includes(error.error);
  }

  /**
   * 判断是否为消息相关错误
   */
  static isMessageError(error: StandardError): boolean {
    const messageErrors: string[] = [
      CHAT_ERROR_CODES.MESSAGE_SEND_FAILED,
      CHAT_ERROR_CODES.RUN_EXECUTION_FAILED,
    ];
    return messageErrors.includes(error.error);
  }

  /**
   * 判断是否为评测相关错误
   */
  static isEvalError(error: StandardError): boolean {
    const evalErrors: string[] = [
      CHAT_ERROR_CODES.EVAL_NOT_ENABLED,
      CHAT_ERROR_CODES.EVAL_COOLDOWN,
      CHAT_ERROR_CODES.EVAL_NOT_FOUND,
      CHAT_ERROR_CODES.INVALID_REASON_TAGS,
    ];
    return evalErrors.includes(error.error);
  }

  /**
   * 判断是否为配置相关错误
   */
  static isConfigError(error: StandardError): boolean {
    const configErrors: string[] = [
      CHAT_ERROR_CODES.INVALID_CONFIG,
      CHAT_ERROR_CODES.EMPTY_CANDIDATE_MODELS,
      CHAT_ERROR_CODES.INVALID_MAX_CHALLENGERS,
      CHAT_ERROR_CODES.PROJECT_AI_CONFIG_INCOMPLETE,
    ];
    return configErrors.includes(error.error);
  }

  /**
   * 判断是否为归档资源错误
   */
  static isArchivedError(error: StandardError): boolean {
    const archivedErrors: string[] = [
      CHAT_ERROR_CODES.ASSISTANT_ARCHIVED,
      CHAT_ERROR_CODES.CONVERSATION_ARCHIVED,
    ];
    return archivedErrors.includes(error.error);
  }

  /**
   * 判断是否为资源不存在错误
   */
  static isNotFoundError(error: StandardError): boolean {
    const notFoundErrors: string[] = [
      CHAT_ERROR_CODES.ASSISTANT_NOT_FOUND,
      CHAT_ERROR_CODES.CONVERSATION_NOT_FOUND,
      CHAT_ERROR_CODES.EVAL_NOT_FOUND,
    ];
    return notFoundErrors.includes(error.error);
  }

  /**
   * 获取聊天错误的操作建议
   * 
   * @param error - 标准错误对象
   * @param t - 国际化翻译函数
   * @returns 操作建议文本
   */
  static getActionSuggestion(error: StandardError, t: (key: string) => string): string | undefined {
    const errorCode = error.error as ChatErrorCode;

    switch (errorCode) {
      case CHAT_ERROR_CODES.ASSISTANT_NOT_FOUND:
      case CHAT_ERROR_CODES.CONVERSATION_NOT_FOUND:
        return t('chat.errors.action_go_back');

      case CHAT_ERROR_CODES.ASSISTANT_ARCHIVED:
      case CHAT_ERROR_CODES.CONVERSATION_ARCHIVED:
        return t('chat.errors.action_select_another');

      case CHAT_ERROR_CODES.MESSAGE_SEND_FAILED:
      case CHAT_ERROR_CODES.RUN_EXECUTION_FAILED:
        return t('chat.errors.action_retry');

      case CHAT_ERROR_CODES.EVAL_NOT_ENABLED:
        return t('chat.errors.action_contact_admin');

      case CHAT_ERROR_CODES.EVAL_COOLDOWN:
        return t('chat.errors.action_wait');

      case CHAT_ERROR_CODES.INVALID_REASON_TAGS:
      case CHAT_ERROR_CODES.INVALID_CONFIG:
      case CHAT_ERROR_CODES.EMPTY_CANDIDATE_MODELS:
      case CHAT_ERROR_CODES.INVALID_MAX_CHALLENGERS:
      case CHAT_ERROR_CODES.PROJECT_AI_CONFIG_INCOMPLETE:
        return t('chat.errors.action_check_input');

      default:
        return ErrorHandler.getHintMessage(error, t);
    }
  }

  /**
   * 获取错误的冷却时间（如果适用）
   * 
   * @param error - 标准错误对象
   * @returns 冷却时间（秒），如果不适用则返回 undefined
   */
  static getCooldownSeconds(error: StandardError): number | undefined {
    if (error.error === CHAT_ERROR_CODES.EVAL_COOLDOWN) {
      // 尝试从 details 中提取冷却时间
      const cooldown = error.details?.cooldown_seconds || error.details?.retry_after;
      if (typeof cooldown === 'number') {
        return cooldown;
      }
    }
    return undefined;
  }
}
