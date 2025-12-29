"use client";

import { useI18n } from '@/lib/i18n-context';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import { RoutingDecision } from './routing-decision';

export function RoutingClient() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{t('routing.title')}</h1>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-6 w-6 rounded-full border-muted-foreground/30 text-muted-foreground"
                aria-label={t('routing.tooltip.label')}
              >
                <Info className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {t('routing.tooltip.description')}
            </TooltipContent>
          </Tooltip>
        </div>
        <p className="text-muted-foreground">{t('routing.description')}</p>
      </div>

      <RoutingDecision />
    </div>
  );
}
