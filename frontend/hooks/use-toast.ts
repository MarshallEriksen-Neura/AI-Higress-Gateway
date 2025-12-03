'use client';

import { useState, useEffect } from 'react';
import { toastManager, ToastContainer } from '@/components/toast';

export const useToast = () => {
  const [toasts, setToasts] = useState<Array<{
    id: string;
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
  }>>([]);

  useEffect(() => {
    // 订阅toast管理器的更新
    const unsubscribe = toastManager.subscribe(setToasts);
    return unsubscribe;
  }, []);

  const removeToast = (id: string) => {
    toastManager.removeToast(id);
  };

  return {
    toasts,
    removeToast,
    Container: ToastContainer,
  };
};

export default useToast;