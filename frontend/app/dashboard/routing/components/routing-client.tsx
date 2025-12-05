"use client";

import { useI18n } from '@/lib/i18n-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RoutingDecision } from './routing-decision';
import { SessionManagement } from './session-management';

export function RoutingClient() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('routing.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('routing.description')}</p>
      </div>

      <Tabs defaultValue="decision" className="space-y-6">
        <TabsList>
          <TabsTrigger value="decision">{t('routing.tabs.decision')}</TabsTrigger>
          <TabsTrigger value="session">{t('routing.tabs.session')}</TabsTrigger>
        </TabsList>

        <TabsContent value="decision" className="space-y-6">
          <RoutingDecision />
        </TabsContent>

        <TabsContent value="session" className="space-y-6">
          <SessionManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}