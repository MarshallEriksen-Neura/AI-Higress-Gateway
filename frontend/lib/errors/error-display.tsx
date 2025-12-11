/**
 * 错误展示 Hook 和组件
 * 
 * 提供统一的错误展示接口，根据错误严重程度自动选择合适的展示方式
 */

'use client';

import { toast } from 'sonner';
import { AlertCircle, AlertTriangle, Info, XCircle } from 'lucide-react';
import { ErrorSeverity } from './types';
import { ErrorHandler } from './error-handler';
import { useI18n } from '@/lib/i18n-context';
import { useCallback } from 'react';

/**
 * 错误展示配置
 */
interface ErrorDisplayOptions {
  /** 上下文信息，会添加到错误消息前面 */
  context?: string;
  /** 重试回调函数 */
  onRetry?: () => void;
  /** 是否在开发环境打印详细错误 */
  logInDev?: boolean;
}

/**
 * 错误展示 Hook
 * 
 * @example
 * ```tsx
 * const { showError } = useErrorDisplay();
 * 
 * try {
 *   await deleteProvider(id);
 * } catch (error) {
 *   showError(error, { context: t('providers.delete_context') });
 * }
 * ```
 */
export function useErrorDisplay() {
  const { t } = useI18n();

  const showError = useCallback((
    error: unknown,
    options: ErrorDisplayOptions = {}
  ) => {
    const {
      context,
      onRetry,
      logInDev = true
    } = options;

    // 标准化错误
    const standardError = ErrorHandler.normalize(error);
    
    // 获取用户友好的错误消息
    const message = ErrorHandler.getUserMessage(standardError, t);
    
    // 获取提示信息
    const hint = ErrorHandler.getHintMessage(standardError, t);
    
    // 构建完整消息
    const fullMessage = context ? `${context}: ${message}` : message;

    // 开发环境打印详细错误
    if (logInDev && process.env.NODE_ENV === 'development') {
      console.group(`[Error] ${standardError.error}`);
      console.error('Standard Error:', standardError);
      console.error('Original Error:', error);
      console.groupEnd();
    }

    // 根据严重程度选择展示方式
    switch (standardError.severity) {
      case ErrorSeverity.INFO:
        toast.info(fullMessage, {
          icon: <Info className="h-4 w-4" />,
          duration: 3000,
          description: hint
        });
        break;

      case ErrorSeverity.WARNING:
        toast.warning(fullMessage, {
          icon: <AlertTriangle className="h-4 w-4" />,
          duration: 4000,
          description: hint,
          action: standardError.retryable && onRetry ? {
            label: t('common.retry'),
            onClick: onRetry
          } : undefined
        });
        break;

      case ErrorSeverity.ERROR:
        toast.error(fullMessage, {
          icon: <XCircle className="h-4 w-4" />,
          duration: 5000,
          description: hint,
          action: standardError.retryable && onRetry ? {
            label: t('common.retry'),
            onClick: onRetry
          } : undefined
        });
        break;

      case ErrorSeverity.CRITICAL:
        toast.error(fullMessage, {
          icon: <AlertCircle className="h-4 w-4" />,
          duration: Infinity,
          description: hint || t('errors.critical_description'),
          action: {
            label: t('common.contact_support'),
            onClick: () => {
              // TODO: 跳转到支持页面或打开支持对话框
              console.log('Contact support clicked');
            }
          },
          cancel: {
            label: t('common.dismiss'),
            onClick: () => {}
          }
        });
        break;
    }
  }, [t]);

  return { showError };
}

/**
 * 错误展示组件（用于特殊场景，如表单验证错误）
 * 
 * @example
 * ```tsx
 * <ErrorDisplay error={error} context="Form validation" />
 * ```
 */
interface ErrorDisplayProps {
  error: unknown;
  context?: string;
  className?: string;
}

export function ErrorDisplay({ error, context, className }: ErrorDisplayProps) {
  const { t } = useI18n();
  
  if (!error) return null;

  const standardError = ErrorHandler.normalize(error);
  const message = ErrorHandler.getUserMessage(standardError, t);
  const hint = ErrorHandler.getHintMessage(standardError, t);
  const fullMessage = context ? `${context}: ${message}` : message;

  // 根据严重程度选择图标和颜色
  const getIcon = () => {
    switch (standardError.severity) {
      case ErrorSeverity.INFO:
        return <Info className="h-4 w-4" />;
      case ErrorSeverity.WARNING:
        return <AlertTriangle className="h-4 w-4" />;
      case ErrorSeverity.ERROR:
        return <XCircle className="h-4 w-4" />;
      case ErrorSeverity.CRITICAL:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getColorClass = () => {
    switch (standardError.severity) {
      case ErrorSeverity.INFO:
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case ErrorSeverity.WARNING:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case ErrorSeverity.ERROR:
        return 'text-red-600 bg-red-50 border-red-200';
      case ErrorSeverity.CRITICAL:
        return 'text-red-700 bg-red-100 border-red-300';
    }
  };

  return (
    <div className={`flex items-start gap-2 p-3 rounded-md border ${getColorClass()} ${className || ''}`}>
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{fullMessage}</p>
        {hint && (
          <p className="text-xs mt-1 opacity-80">{hint}</p>
        )}
      </div>
    </div>
  );
}
