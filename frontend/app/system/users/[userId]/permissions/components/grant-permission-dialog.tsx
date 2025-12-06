"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n-context";
import { PERMISSION_TYPES } from "@/lib/constants/permission-types";
import { GrantPermissionRequest } from "@/lib/api-types";

interface GrantPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: GrantPermissionRequest) => Promise<void>;
}

export function GrantPermissionDialog({
  open,
  onOpenChange,
  onSubmit,
}: GrantPermissionDialogProps) {
  const { t } = useI18n();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<GrantPermissionRequest>({
    permission_type: "",
    permission_value: undefined,
    expires_at: undefined,
    notes: undefined,
  });

  const selectedType = PERMISSION_TYPES.find(
    (p) => p.type === formData.permission_type
  );

  const handleSubmit = async () => {
    if (!formData.permission_type) return;

    setSubmitting(true);
    try {
      await onSubmit(formData);
      // Reset form
      setFormData({
        permission_type: "",
        permission_value: undefined,
        expires_at: undefined,
        notes: undefined,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to grant permission:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExpiryChange = (value: string) => {
    if (value === "never") {
      setFormData({ ...formData, expires_at: undefined });
      return;
    }

    const now = new Date();
    let expiryDate: Date;

    switch (value) {
      case "1month":
        expiryDate = new Date(now.setMonth(now.getMonth() + 1));
        break;
      case "3months":
        expiryDate = new Date(now.setMonth(now.getMonth() + 3));
        break;
      case "6months":
        expiryDate = new Date(now.setMonth(now.getMonth() + 6));
        break;
      case "1year":
        expiryDate = new Date(now.setFullYear(now.getFullYear() + 1));
        break;
      default:
        return;
    }

    setFormData({ ...formData, expires_at: expiryDate.toISOString() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("permissions.grant_dialog_title")}</DialogTitle>
          <DialogDescription>
            {t("permissions.grant_dialog_desc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Permission Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("permissions.label_type")} *
            </label>
            <Select
              value={formData.permission_type}
              onValueChange={(value) =>
                setFormData({ ...formData, permission_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t("permissions.placeholder_select_type")}
                />
              </SelectTrigger>
              <SelectContent>
                {PERMISSION_TYPES.map((type) => (
                  <SelectItem key={type.type} value={type.type}>
                    <div>
                      <div className="font-medium">{t(type.nameKey)}</div>
                      <div className="text-xs text-muted-foreground">
                        {t(type.descriptionKey)}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Permission Value (conditional) */}
          {selectedType?.requiresValue && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {selectedType.valueLabel
                  ? t(selectedType.valueLabel)
                  : t("permissions.label_value")}
              </label>
              <Input
                value={formData.permission_value || ""}
                onChange={(e) =>
                  setFormData({ ...formData, permission_value: e.target.value })
                }
                placeholder={
                  selectedType.valuePlaceholder
                    ? t(selectedType.valuePlaceholder)
                    : t("permissions.placeholder_value")
                }
              />
            </div>
          )}

          {/* Expires At */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("permissions.label_expires")}
            </label>
            <Select onValueChange={handleExpiryChange} defaultValue="never">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">
                  {t("permissions.expires_never")}
                </SelectItem>
                <SelectItem value="1month">
                  {t("permissions.expires_1month")}
                </SelectItem>
                <SelectItem value="3months">
                  {t("permissions.expires_3months")}
                </SelectItem>
                <SelectItem value="6months">
                  {t("permissions.expires_6months")}
                </SelectItem>
                <SelectItem value="1year">
                  {t("permissions.expires_1year")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("permissions.label_notes")}
            </label>
            <Textarea
              value={formData.notes || ""}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder={t("permissions.placeholder_notes")}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {t("providers.btn_cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.permission_type || submitting}
          >
            {t("providers.btn_create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}