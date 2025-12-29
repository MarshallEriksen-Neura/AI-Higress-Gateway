"use client";

import { useState, FormEvent } from 'react';
import { useI18n } from '@/lib/i18n-context';
import { useRoutingDecision, useLogicalModels } from '@/lib/swr';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { RoutingTable } from './index';
import type { RoutingDecisionRequest } from '@/http/routing';

export function RoutingDecision() {
  const { t } = useI18n();
  const { makeDecision, decision, loading, error } = useRoutingDecision();
  
  // 获取逻辑模型列表
  const { models, loading: modelsLoading } = useLogicalModels();
  
  // 表单状态
  const [formData, setFormData] = useState<RoutingDecisionRequest>({
    logical_model: '',
    strategy: 'balanced',
    preferred_region: '',
    exclude_providers: [],
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.logical_model) {
      return;
    }

    // 构建请求数据，移除空值
    const requestData: RoutingDecisionRequest = {
      logical_model: formData.logical_model,
      strategy: formData.strategy,
    };

    if (formData.preferred_region) {
      requestData.preferred_region = formData.preferred_region;
    }
    if (formData.exclude_providers && formData.exclude_providers.length > 0) {
      requestData.exclude_providers = formData.exclude_providers;
    }

    try {
      await makeDecision(requestData);
    } catch (err) {
      console.error('Failed to make routing decision:', err);
    }
  };

  const handleExcludeProvidersChange = (value: string) => {
    // 将逗号分隔的字符串转换为数组
    const providers = value.split(',').map(p => p.trim()).filter(p => p);
    setFormData({ ...formData, exclude_providers: providers });
  };

  return (
    <div className="space-y-6">
      {/* 表单卡片 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('routing.decision.title')}</CardTitle>
          <CardDescription>{t('routing.decision.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 逻辑模型选择 */}
            <div className="space-y-2">
              <Label htmlFor="logical_model">{t('routing.decision.logical_model')}</Label>
              {modelsLoading ? (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('providers.loading')}</span>
                </div>
              ) : (
                <Select
                  value={formData.logical_model}
                  onValueChange={(value) => setFormData({ ...formData, logical_model: value })}
                >
                  <SelectTrigger id="logical_model">
                    <SelectValue placeholder={t('routing.decision.logical_model_placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {models?.map((model) => (
                      <SelectItem key={model.logical_id} value={model.logical_id}>
                        {model.display_name || model.logical_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* 路由策略选择 */}
            <div className="space-y-2">
              <Label htmlFor="strategy">{t('routing.decision.strategy')}</Label>
              <Select
                value={formData.strategy}
                onValueChange={(value: any) => setFormData({ ...formData, strategy: value })}
              >
                <SelectTrigger id="strategy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latency_first">{t('routing.decision.strategy_latency')}</SelectItem>
                  <SelectItem value="cost_first">{t('routing.decision.strategy_cost')}</SelectItem>
                  <SelectItem value="reliability_first">{t('routing.decision.strategy_reliability')}</SelectItem>
                  <SelectItem value="balanced">{t('routing.decision.strategy_balanced')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 可选参数 */}
            <div className="space-y-2">
              <Label htmlFor="preferred_region">{t('routing.decision.preferred_region')}</Label>
              <Input
                id="preferred_region"
                type="text"
                placeholder={t('routing.decision.preferred_region_placeholder')}
                value={formData.preferred_region}
                onChange={(e) => setFormData({ ...formData, preferred_region: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exclude_providers">{t('routing.decision.exclude_providers')}</Label>
              <Input
                id="exclude_providers"
                type="text"
                placeholder={t('routing.decision.exclude_providers_placeholder')}
                value={formData.exclude_providers?.join(', ') || ''}
                onChange={(e) => handleExcludeProvidersChange(e.target.value)}
              />
            </div>

            {/* 错误提示 */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error.message || t('routing.error.decision_failed')}
                </AlertDescription>
              </Alert>
            )}

            {/* 提交按钮 */}
            <Button type="submit" disabled={loading || !formData.logical_model} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('routing.decision.deciding')}
                </>
              ) : (
                t('routing.decision.btn_decide')
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 结果卡片 */}
      {decision && (
        <Card>
          <CardHeader>
            <CardTitle>{t('routing.decision.result_title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 选中的上游 */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">{t('routing.decision.selected_upstream')}</h3>
              <div className="p-4 bg-accent rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">{t('routing.decision.provider')}:</span>
                    <span className="ml-2 font-medium">{decision.selected_upstream.provider_id}</span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">{t('routing.decision.model')}:</span>
                    <span className="ml-2 font-medium">{decision.selected_upstream.model_id}</span>
                  </div>
                  {decision.selected_upstream.region && (
                    <div>
                      <span className="text-sm text-muted-foreground">{t('routing.decision.region')}:</span>
                      <span className="ml-2 font-medium">{decision.selected_upstream.region}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-sm text-muted-foreground">{t('routing.decision.decision_time')}:</span>
                    <span className="ml-2 font-medium">{decision.decision_time.toFixed(2)}ms</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 决策理由 */}
            {decision.reasoning && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">{t('routing.decision.reasoning')}</h3>
                <p className="text-sm text-muted-foreground p-4 bg-muted rounded-lg">
                  {decision.reasoning}
                </p>
              </div>
            )}

            {/* 候选列表 */}
            {decision.all_candidates && decision.all_candidates.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">{t('routing.decision.candidates_title')}</h3>
                <RoutingTable 
                  candidates={decision.all_candidates}
                  selectedUpstream={decision.selected_upstream.provider_id}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 无结果提示 */}
      {!decision && !loading && (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              {t('routing.decision.no_result')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
