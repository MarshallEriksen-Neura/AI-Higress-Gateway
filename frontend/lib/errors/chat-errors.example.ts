/**
 * 聊天错误处理使用示例
 * 
 * 本文件展示如何在聊天模块中使用错误处理工具和国际化
 */

import { ChatErrorHandler, CHAT_ERROR_CODES } from './chat-errors';
import { ErrorHandler } from './error-handler';
import type { StandardError } from './types';

/**
 * 示例 1: 处理 API 错误响应
 */
export function handleApiError(error: unknown, t: (key: string) => string) {
  // 1. 标准化错误
  const standardError = ErrorHandler.normalize(error);
  
  // 2. 获取用户友好的错误消息
  const userMessage = ErrorHandler.getUserMessage(standardError, t);
  
  // 3. 获取操作建议
  const actionSuggestion = ChatErrorHandler.getActionSuggestion(standardError, t);
  
  // 4. 判断错误类型并采取相应行动
  if (ChatErrorHandler.isArchivedError(standardError)) {
    // 归档资源错误 - 禁用编辑功能
    console.log('Resource is archived, disabling edit actions');
  } else if (ChatErrorHandler.isNotFoundError(standardError)) {
    // 资源不存在 - 返回上一页
    console.log('Resource not found, navigating back');
  } else if (standardError.error === CHAT_ERROR_CODES.EVAL_COOLDOWN) {
    // 评测冷却 - 显示倒计时
    const cooldownSeconds = ChatErrorHandler.getCooldownSeconds(standardError);
    console.log(`Cooldown active: ${cooldownSeconds} seconds remaining`);
  }
  
  return {
    message: userMessage,
    action: actionSuggestion,
    retryable: ErrorHandler.isRetryable(standardError),
  };
}

/**
 * 示例 2: 在 React 组件中使用
 */
export function useErrorHandling() {
  // 假设有一个 useI18n hook
  const t = (key: string) => key; // 实际使用时替换为真实的 i18n 函数
  
  const handleError = (error: unknown) => {
    const standardError = ErrorHandler.normalize(error);
    
    // 获取错误消息
    const message = ErrorHandler.getUserMessage(standardError, t);
    // const hint = ChatErrorHandler.getActionSuggestion(standardError, t);
    
    // 显示 toast 通知
    // toast.error(message, { description: hint });
    
    // 根据错误类型执行特定操作
    if (ChatErrorHandler.isAssistantError(standardError)) {
      // 处理助手相关错误
      console.log('Assistant error:', message);
    } else if (ChatErrorHandler.isConversationError(standardError)) {
      // 处理会话相关错误
      console.log('Conversation error:', message);
    } else if (ChatErrorHandler.isMessageError(standardError)) {
      // 处理消息相关错误
      console.log('Message error:', message);
    } else if (ChatErrorHandler.isEvalError(standardError)) {
      // 处理评测相关错误
      console.log('Eval error:', message);
    }
    
    return standardError;
  };
  
  return { handleError };
}

/**
 * 示例 3: 在 SWR mutation 中使用
 */
export async function sendMessageWithErrorHandling(
  _conversationId: string,
  _content: string,
  t: (key: string) => string
) {
  try {
    // 调用 API
    // const response = await messageService.sendMessage(conversationId, { content });
    // return response;
    
    // 模拟成功
    return { message_id: '123', baseline_run: {} };
  } catch (error) {
    // 标准化错误
    const standardError = ErrorHandler.normalize(error);
    
    // 获取用户友好的错误消息
    const userMessage = ErrorHandler.getUserMessage(standardError, t);
    
    // 判断是否可以重试
    if (ErrorHandler.isRetryable(standardError)) {
      console.log('Error is retryable, showing retry button');
    }
    
    // 抛出标准化错误供上层处理
    throw new Error(userMessage);
  }
}

/**
 * 示例 4: 错误类型判断
 */
export function categorizeError(error: StandardError) {
  const categories = {
    isAssistant: ChatErrorHandler.isAssistantError(error),
    isConversation: ChatErrorHandler.isConversationError(error),
    isMessage: ChatErrorHandler.isMessageError(error),
    isEval: ChatErrorHandler.isEvalError(error),
    isConfig: ChatErrorHandler.isConfigError(error),
    isArchived: ChatErrorHandler.isArchivedError(error),
    isNotFound: ChatErrorHandler.isNotFoundError(error),
    isAuth: ErrorHandler.isAuthError(error),
    isPermission: ErrorHandler.isPermissionError(error),
    isNetwork: ErrorHandler.isNetworkError(error),
    isServer: ErrorHandler.isServerError(error),
  };
  
  return categories;
}

/**
 * 示例 5: 国际化使用
 */
export function getLocalizedErrorMessage(error: StandardError, language: 'en' | 'zh') {
  // 模拟 i18n 函数
  const translations = {
    en: {
      'chat.errors.assistant_not_found': 'Assistant not found or has been deleted',
      'chat.errors.conversation_archived': 'Conversation has been archived and cannot continue',
      'chat.errors.eval_cooldown': 'Evaluation triggered too frequently, please try again later',
    },
    zh: {
      'chat.errors.assistant_not_found': '助手不存在或已被删除',
      'chat.errors.conversation_archived': '会话已归档，无法继续对话',
      'chat.errors.eval_cooldown': '评测触发过于频繁，请稍后再试',
    },
  };
  
  const t = (key: string) => translations[language][key as keyof typeof translations['en']] || key;
  
  return ErrorHandler.getUserMessage(error, t);
}
