"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
  ProviderPreset,
  providerPresetService,
} from "@/http/provider-preset";
import { ProviderPresetTable } from "@/components/dashboard/provider-presets/provider-preset-table";
import { ProviderPresetForm } from "@/components/dashboard/provider-presets/provider-preset-form";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ProviderPresetsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<ProviderPreset | undefined>();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingPresetId, setDeletingPresetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 使用SWR获取数据
  const { data, error, isLoading, mutate } = useSWR(
    "/provider-presets",
    providerPresetService.getProviderPresets,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  // 打开创建表单
  const handleCreate = () => {
    setEditingPreset(undefined);
    setFormOpen(true);
  };

  // 打开编辑表单
  const handleEdit = (preset: ProviderPreset) => {
    setEditingPreset(preset);
    setFormOpen(true);
  };

  // 打开删除确认
  const handleDeleteClick = (presetId: string) => {
    setDeletingPresetId(presetId);
    setDeleteConfirmOpen(true);
  };

  // 确认删除
  const handleDeleteConfirm = async () => {
    if (!deletingPresetId) return;

    setIsDeleting(true);
    try {
      await providerPresetService.deleteProviderPreset(deletingPresetId);
      toast.success("预设删除成功");
      mutate(); // 刷新列表
    } catch (error: any) {
      console.error("删除失败:", error);
      const message = error.response?.data?.detail || error.message || "删除失败";
      toast.error(message);
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
      setDeletingPresetId(null);
    }
  };

  // 表单提交成功
  const handleFormSuccess = () => {
    mutate(); // 刷新列表
  };

  if (error) {
    return (
      <div className="space-y-6 max-w-7xl">
        <div>
          <h1 className="text-3xl font-bold mb-2">提供商预设管理</h1>
          <p className="text-muted-foreground">管理官方提供商预设配置</p>
        </div>
        <div className="rounded-md border border-destructive p-8 text-center">
          <p className="text-destructive">加载失败: {error.message}</p>
          <Button onClick={() => mutate()} className="mt-4">
            重试
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* 页面标题和创建按钮 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">提供商预设管理</h1>
          <p className="text-muted-foreground">
            管理官方提供商预设配置，用户可在创建私有提供商时选择使用
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          创建预设
        </Button>
      </div>

      {/* 预设列表表格 */}
      <ProviderPresetTable
        presets={data?.items || []}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
      />

      {/* 创建/编辑表单对话框 */}
      <ProviderPresetForm
        open={formOpen}
        onOpenChange={setFormOpen}
        preset={editingPreset}
        onSuccess={handleFormSuccess}
      />

      {/* 删除确认对话框 */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除预设 <span className="font-mono font-semibold">{deletingPresetId}</span> 吗？
              此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={isDeleting}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "删除中..." : "删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}