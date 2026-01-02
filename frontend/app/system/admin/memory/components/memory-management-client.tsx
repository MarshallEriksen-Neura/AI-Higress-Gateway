'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Brain,
  CheckCircle,
  Clock,
  Plus,
  Trash2,
  RefreshCw,
  Tag,
  FileText,
} from 'lucide-react';

import { useI18n } from '@/lib/i18n-context';
import { adminMemoryService, type AdminMemoryItem } from '@/http';
import useSWR from 'swr';

interface MemoryItemProps {
  item: AdminMemoryItem;
  onApprove?: (item: AdminMemoryItem) => void;
  onDelete: (item: AdminMemoryItem) => void;
  showApprove?: boolean;
}

function MemoryItem({ item, onApprove, onDelete, showApprove = false }: MemoryItemProps) {
  const { t } = useI18n();

  return (
    <div className="p-4 border rounded-lg hover:bg-muted/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-sm whitespace-pre-wrap break-words">{item.content}</p>

          <div className="flex flex-wrap gap-1.5">
            {item.categories?.map((cat) => (
              <Badge key={cat} variant="secondary" className="text-xs">
                <Tag className="w-3 h-3 mr-1" />
                {cat}
              </Badge>
            ))}
            {item.keywords?.map((kw) => (
              <Badge key={kw} variant="outline" className="text-xs">
                {kw}
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {item.created_at && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(item.created_at).toLocaleString()}
              </span>
            )}
            {item.source_id && (
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {t('system.memory.from_conversation')}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {showApprove && onApprove && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onApprove(item)}
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              {t('system.memory.approve')}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(item)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MemoryListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 border rounded-lg space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MemoryManagementClient() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'candidates' | 'published'>('candidates');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AdminMemoryItem | null>(null);
  const [formData, setFormData] = useState({
    content: '',
    categories: '',
    keywords: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch candidates
  const {
    data: candidatesData,
    isLoading: candidatesLoading,
    mutate: mutateCandidates,
  } = useSWR(
    activeTab === 'candidates' ? 'admin-memory-candidates' : null,
    () => adminMemoryService.listCandidates(50),
    { revalidateOnFocus: false }
  );

  // Fetch published
  const {
    data: publishedData,
    isLoading: publishedLoading,
    mutate: mutatePublished,
  } = useSWR(
    activeTab === 'published' ? 'admin-memory-published' : null,
    () => adminMemoryService.listPublished(50),
    { revalidateOnFocus: false }
  );

  const handleRefresh = useCallback(() => {
    if (activeTab === 'candidates') {
      mutateCandidates();
    } else {
      mutatePublished();
    }
  }, [activeTab, mutateCandidates, mutatePublished]);

  const handleOpenApprove = (item: AdminMemoryItem) => {
    setSelectedItem(item);
    setFormData({
      content: item.content,
      categories: item.categories?.join(', ') || '',
      keywords: item.keywords?.join(', ') || '',
    });
    setIsApproveOpen(true);
  };

  const handleOpenDelete = (item: AdminMemoryItem) => {
    setSelectedItem(item);
    setIsDeleteOpen(true);
  };

  const handleOpenCreate = () => {
    setFormData({ content: '', categories: '', keywords: '' });
    setIsCreateOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      const categories = formData.categories
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const keywords = formData.keywords
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await adminMemoryService.approve(selectedItem.id, {
        content: formData.content.trim() || undefined,
        categories: categories.length > 0 ? categories : undefined,
        keywords: keywords.length > 0 ? keywords : undefined,
      });
      toast.success(t('system.memory.approve_success'));
      setIsApproveOpen(false);
      mutateCandidates();
      mutatePublished();
    } catch (error) {
      toast.error(t('system.memory.approve_failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.content.trim()) {
      toast.error(t('system.memory.content_required'));
      return;
    }
    setSubmitting(true);
    try {
      const categories = formData.categories
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const keywords = formData.keywords
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await adminMemoryService.create({
        content: formData.content.trim(),
        categories,
        keywords,
      });
      toast.success(t('system.memory.create_success'));
      setIsCreateOpen(false);
      mutatePublished();
    } catch (error) {
      toast.error(t('system.memory.create_failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      await adminMemoryService.delete(selectedItem.id);
      toast.success(t('system.memory.delete_success'));
      setIsDeleteOpen(false);
      mutateCandidates();
      mutatePublished();
    } catch (error) {
      toast.error(t('system.memory.delete_failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const candidates = candidatesData?.items || [];
  const published = publishedData?.items || [];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <CardTitle>{t('system.memory.title')}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4 mr-1" />
                {t('common.refresh')}
              </Button>
              <Button size="sm" onClick={handleOpenCreate}>
                <Plus className="w-4 h-4 mr-1" />
                {t('system.memory.create')}
              </Button>
            </div>
          </div>
          <CardDescription>{t('system.memory.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'candidates' | 'published')}
          >
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="candidates" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {t('system.memory.candidates')}
                {candidates.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {candidates.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="published" className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {t('system.memory.published')}
                {published.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {published.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="candidates">
              <ScrollArea className="h-[500px] pr-4">
                {candidatesLoading ? (
                  <MemoryListSkeleton />
                ) : candidates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Clock className="w-12 h-12 mb-4 opacity-50" />
                    <p>{t('system.memory.no_candidates')}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {candidates.map((item) => (
                      <MemoryItem
                        key={item.id}
                        item={item}
                        onApprove={handleOpenApprove}
                        onDelete={handleOpenDelete}
                        showApprove
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="published">
              <ScrollArea className="h-[500px] pr-4">
                {publishedLoading ? (
                  <MemoryListSkeleton />
                ) : published.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mb-4 opacity-50" />
                    <p>{t('system.memory.no_published')}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {published.map((item) => (
                      <MemoryItem
                        key={item.id}
                        item={item}
                        onDelete={handleOpenDelete}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('system.memory.create_title')}</DialogTitle>
            <DialogDescription>{t('system.memory.create_description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('system.memory.content')}</label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder={t('system.memory.content_placeholder')}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('system.memory.categories')}</label>
              <Input
                value={formData.categories}
                onChange={(e) => setFormData({ ...formData, categories: e.target.value })}
                placeholder={t('system.memory.categories_placeholder')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('system.memory.keywords')}</label>
              <Input
                value={formData.keywords}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                placeholder={t('system.memory.keywords_placeholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? t('common.saving') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('system.memory.approve_title')}</DialogTitle>
            <DialogDescription>{t('system.memory.approve_description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('system.memory.content')}</label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('system.memory.categories')}</label>
              <Input
                value={formData.categories}
                onChange={(e) => setFormData({ ...formData, categories: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('system.memory.keywords')}</label>
              <Input
                value={formData.keywords}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleApprove} disabled={submitting} className="bg-green-600 hover:bg-green-700">
              {submitting ? t('common.saving') : t('system.memory.approve')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('system.memory.delete_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('system.memory.delete_description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? t('common.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
