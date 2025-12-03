'use client';

import { useToast } from '@/hooks/use-toast';

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const { toasts, removeToast, Container } = useToast();

  return (
    <>
      {children}
      {toasts.length > 0 && <Container toasts={toasts} onRemoveToast={removeToast} />}
    </>
  );
};