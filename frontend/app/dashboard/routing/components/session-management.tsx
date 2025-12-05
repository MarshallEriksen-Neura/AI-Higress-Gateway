"use client";

import { useState, FormEvent } from 'react';
import { useI18n } from '@/lib/i18n-context';
import { useSession, useDeleteSession } from '@/lib/swr';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function SessionManagement() {
  const { t } = useI18n();
  const [conversationId, setConversationId] = useState('');
  const [searchedId, setSearchedId] = useState<string | null>(null);
  
  // 获取会话信息
  const { session, loading, error } = useSession(searchedId);
  
  // 删除会话
  const { deleteSession, deleting } = useDeleteSession();

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (conversationId.trim()) {
      setSearchedId(conversationId.trim());
    }
  };

  const handleDelete = async () => {
    if (!searchedId) return;

    try {
      await deleteSession(searchedId);
      toast.success(t('routing.session.delete_success'));
      setSearchedId(null);
      setConversationId('');
    } catch (err: any) {
      toast.error(err.message || t('routing.error.delete_failed'));
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* 搜索表单 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('routing.session.title')}</CardTitle>
          <CardDescription>{t('routing.session.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="conversation_id">{t('routing.session.conversation_id')}</Label>
              <div className="flex gap-2">
                <Input
                  id="conversation_id"
                  type="text"
                  placeholder={t('routing.session.conversation_id_placeholder')}
                  value={conversationId}
                  onChange={(e) => setConversationId(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={loading || !conversationId.trim()}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      {t('routing.session.btn_search')}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* 错误提示 */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error.message || t('routing.error.session_not_found')}
                </AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>

      {/* 会话详情 */}
      {session && (
        <Card>
          <CardHeader>
            <CardTitle>{t('routing.session.details_title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  {t('routing.session.conversation_id')}
                </div>
                <div className="font-mono text-sm bg-muted p-2 rounded">
                  {session.conversation_id}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  {t('routing.session.logical_model')}
                </div>
                <div className="font-medium">{session.logical_model}</div>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  {t('routing.session.provider')}
                </div>
                <div className="font-medium">{session.provider_id}</div>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  {t('routing.session.model')}
                </div>
                <div className="font-medium">{session.model_id}</div>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  {t('routing.session.created_at')}
                </div>
                <div className="text-sm">{formatTimestamp(session.created_at)}</div>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  {t('routing.session.last_used_at')}
                </div>
                <div className="text-sm">{formatTimestamp(session.last_used_at)}</div>
              </div>
            </div>

            {/* 删除按钮 */}
            <div className="pt-4 border-t">
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('routing.session.deleting')}
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('routing.session.btn_delete')}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 无结果提示 */}
      {!session && !loading && searchedId && (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              {t('routing.session.no_result')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}