"use client";

import { useI18n } from '@/lib/i18n-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';
import type { CandidateInfo } from '@/http/routing';

interface RoutingTableProps {
  candidates: CandidateInfo[];
  selectedUpstream?: string;
}

export function RoutingTable({ candidates, selectedUpstream }: RoutingTableProps) {
  const { t } = useI18n();

  // 格式化百分比
  const formatPercent = (value: number | undefined) => {
    if (value === undefined || value === null) return 'N/A';
    return `${(value * 100).toFixed(1)}%`;
  };

  // 格式化延迟
  const formatLatency = (value: number | undefined) => {
    if (value === undefined || value === null) return 'N/A';
    return `${value.toFixed(0)}ms`;
  };

  // 格式化成本（基于输入输出成本计算平均值）
  const formatCost = (costInput: number | null | undefined, costOutput: number | null | undefined) => {
    if (costInput === undefined || costInput === null || costOutput === undefined || costOutput === null) return 'N/A';
    const avgCost = (costInput + costOutput) / 2;
    return `${avgCost.toFixed(6)}`;
  };

  // 格式化评分
  const formatScore = (value: number | undefined) => {
    if (value === undefined || value === null) return 'N/A';
    return value.toFixed(2);
  };

  // 获取评分颜色
  const getScoreColor = (score: number | undefined) => {
    if (score === undefined || score === null) return 'secondary';
    if (score >= 0.8) return 'default';
    if (score >= 0.6) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>{t('routing.table.provider')}</TableHead>
            <TableHead>{t('routing.table.model')}</TableHead>
            <TableHead>{t('routing.table.region')}</TableHead>
            <TableHead className="text-right">{t('routing.table.score')}</TableHead>
            <TableHead className="text-right">{t('routing.table.success_rate')}</TableHead>
            <TableHead className="text-right">{t('routing.table.latency')}</TableHead>
            <TableHead className="text-right">{t('routing.table.cost')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {candidates.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                {t('routing.table.no_candidates')}
              </TableCell>
            </TableRow>
          ) : (
            candidates.map((candidate, index) => {
              const isSelected = selectedUpstream === candidate.upstream.provider_id;
              return (
                <TableRow
                  key={`${candidate.upstream.provider_id}-${candidate.upstream.model_id}-${index}`}
                  className={isSelected ? 'bg-accent' : ''}
                >
                  <TableCell>
                    {isSelected && (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {candidate.upstream.provider_id}
                  </TableCell>
                  <TableCell>{candidate.upstream.model_id}</TableCell>
                  <TableCell>
                    {candidate.upstream.region ? (
                      <Badge variant="outline">{candidate.upstream.region}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={getScoreColor(candidate.score)}>
                      {formatScore(candidate.score)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPercent(candidate.metrics?.success_rate)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatLatency(candidate.metrics?.avg_latency_ms)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCost(candidate.upstream.cost_input, candidate.upstream.cost_output)}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
