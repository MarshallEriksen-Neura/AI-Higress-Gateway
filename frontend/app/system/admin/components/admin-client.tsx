'use client';

import { GatewayConfigCard } from './gateway-config-card';
import { ProviderLimitsCard } from './provider-limits-card';
import { CacheMaintenanceCard } from './cache-maintenance-card';
import { UpstreamProxyCard } from './upstream-proxy-card';
import { MemoryCard } from './memory-card';

/**
 * 系统管理页面客户端包装器
 * 协调各个功能卡片组件
 */
export function AdminClient() {
  return (
    <div className="space-y-6">
      <GatewayConfigCard />
      <ProviderLimitsCard />
      <UpstreamProxyCard />
      <MemoryCard />
      <CacheMaintenanceCard />
    </div>
  );
}
