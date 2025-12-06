"use client";

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useI18n } from '@/lib/i18n-context';
import { parseUserAgent, formatDeviceInfo } from '@/lib/utils/user-agent-parser';
import type { SessionResponse } from '@/lib/api-types';

interface RevokeSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: SessionResponse | null;
  onConfirm: () => void;
  isRevoking: boolean;
}

export function RevokeSessionDialog({
  open,
  onOpenChange,
  session,
  onConfirm,
  isRevoking,
}: RevokeSessionDialogProps) {
  const { t } = useI18n();

  if (!session) return null;

  const parsed = parseUserAgent(session.device_info?.user_agent || null);
  const deviceInfo = formatDeviceInfo(parsed);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('sessions.revoke_dialog_title')}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>{t('sessions.revoke_dialog_description')}</p>
            <div className="mt-3 p-3 bg-muted rounded-md text-sm">
              <p className="font-medium text-foreground">{deviceInfo}</p>
              <p className="text-muted-foreground">
                {session.device_info?.ip_address || t('sessions.unknown_ip')}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRevoking}>
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isRevoking}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isRevoking ? t('sessions.revoking') : t('sessions.revoke_session')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface RevokeAllDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionCount: number;
  onConfirm: () => void;
  isRevoking: boolean;
}

export function RevokeAllSessionsDialog({
  open,
  onOpenChange,
  sessionCount,
  onConfirm,
  isRevoking,
}: RevokeAllDialogProps) {
  const { t } = useI18n();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('sessions.revoke_all_dialog_title')}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>{t('sessions.revoke_all_dialog_description')}</p>
            <div className="mt-3 p-3 bg-muted rounded-md text-sm">
              <p className="font-medium text-foreground">
                {t('sessions.sessions_to_revoke')}: {sessionCount}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRevoking}>
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isRevoking}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isRevoking ? t('sessions.revoking') : t('sessions.revoke_all_sessions')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}