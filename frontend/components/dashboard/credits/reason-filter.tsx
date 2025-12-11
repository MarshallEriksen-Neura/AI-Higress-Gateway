"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n-context";

export type TransactionReason = 
  | 'usage' 
  | 'stream_usage' 
  | 'stream_estimate' 
  | 'admin_topup' 
  | 'auto_daily_topup' 
  | 'adjust' 
  | 'all';

interface ReasonFilterProps {
  value: TransactionReason;
  onChange: (value: TransactionReason) => void;
  disabled?: boolean;
}

export function ReasonFilter({
  value,
  onChange,
  disabled = false
}: ReasonFilterProps) {
  const { t } = useI18n();

  const reasonMap: Record<TransactionReason, string> = {
    'all': t("credits.filter_all_reasons"),
    'usage': t("credits.reason_usage"),
    'stream_usage': t("credits.reason_stream_usage"),
    'stream_estimate': t("credits.reason_stream_estimate"),
    'admin_topup': t("credits.reason_admin_topup"),
    'auto_daily_topup': t("credits.reason_auto_topup"),
    'adjust': t("credits.reason_adjustment"),
  };

  return (
    <Select
      value={value}
      onValueChange={(val) => onChange(val as TransactionReason)}
      disabled={disabled}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(reasonMap).map(([key, label]) => (
          <SelectItem key={key} value={key}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
