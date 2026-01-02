'use client';

import { Brain } from 'lucide-react';
import { useI18n } from '@/lib/i18n-context';

export function PageHeader() {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-primary/10">
        <Brain className="h-6 w-6 text-primary" />
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('system.memory.page_title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('system.memory.page_description')}
        </p>
      </div>
    </div>
  );
}
