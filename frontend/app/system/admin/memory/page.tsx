import { MemoryManagementClient } from './components/memory-management-client';
import { PageHeader } from './components/page-header';

/**
 * AI 记忆系统管理页面
 * 管理员灰度控制、候选记忆审核、已发布记忆管理
 */
export default function AdminMemoryPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader />
      <MemoryManagementClient />
    </div>
  );
}
