"use client";

import { useI18n } from '@/lib/i18n-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Brain } from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * AI 记忆系统入口卡片（系统管理页）
 */
export function MemoryCard() {
  const { t } = useI18n();
  const router = useRouter();

  const handleNavigate = () => {
    router.push('/system/admin/memory');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-normal">
            {t('system.memory.card_title')}
          </CardTitle>
        </div>
        <CardDescription>
          {t('system.memory.card_description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" size="sm" onClick={handleNavigate}>
          {t('system.memory.view_details')}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
