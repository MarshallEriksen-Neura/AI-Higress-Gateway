"use client";

import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import type { Model } from "@/http/provider";
import { providerService } from "@/http/provider";
import { useI18n } from "@/lib/i18n-context";
import { useErrorDisplay } from "@/lib/errors";
import { toast } from "sonner";
import { CAPABILITY_META, normalize_capabilities } from "./model-capabilities";
import { ModelCardView } from "./model-card-view";

interface ModelCardProps {
  providerId: string;
  model: Model;
  selected?: boolean;
  canEdit: boolean;
  onOpenSettings: () => void;
  onRefresh: () => Promise<void>;
}

function formatDate(timestamp: number | undefined, locale: string): string {
  if (!timestamp) return "-";
  return new Date(timestamp * 1000).toLocaleDateString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function ModelCard({
  providerId,
  model,
  selected = false,
  canEdit,
  onOpenSettings,
  onRefresh,
}: ModelCardProps) {
  const { t, language } = useI18n();
  const { showError } = useErrorDisplay();
  const [toggling, setToggling] = useState(false);
  const [localDisabled, setLocalDisabled] = useState(Boolean(model.disabled));

  useEffect(() => {
    setLocalDisabled(Boolean(model.disabled));
  }, [model.disabled, model.model_id]);

  const pricing = (model.pricing || {}) as Record<string, number>;
  const pricingInput = typeof pricing.input === "number" ? pricing.input : null;
  const pricingOutput = typeof pricing.output === "number" ? pricing.output : null;

  const capabilities = useMemo(
    () => normalize_capabilities(model.capabilities),
    [model.capabilities]
  );

  const capabilityIcons = capabilities.slice(0, 5).map((cap) => {
    const meta = CAPABILITY_META[cap];
    return {
      key: cap,
      Icon: meta.icon as LucideIcon,
      label: t(meta.labelKey),
    };
  });

  const locale = language === "en" ? "en-US" : "zh-CN";

  const toggleDisabled = async (nextDisabled: boolean) => {
    if (toggling) return;
    setToggling(true);
    const prev = localDisabled;
    setLocalDisabled(nextDisabled);
    try {
      await providerService.updateProviderModelDisabled(providerId, model.model_id, {
        disabled: nextDisabled,
      });
      toast.success(
        nextDisabled
          ? t("providers.model_disable_success")
          : t("providers.model_enable_success")
      );
      await onRefresh();
    } catch (err: unknown) {
      setLocalDisabled(prev);
      showError(err, {
        context: nextDisabled
          ? t("providers.model_disable_error")
          : t("providers.model_enable_error"),
      });
    } finally {
      setToggling(false);
    }
  };

  return (
    <ModelCardView
      displayName={model.display_name || model.model_id}
      modelId={model.model_id}
      ownedBy={model.metadata?.owned_by || "-"}
      createdAtLabel={formatDate(model.metadata?.created, locale)}
      selected={selected}
      disabled={localDisabled}
      canEdit={canEdit}
      toggling={toggling}
      pricingInput={pricingInput}
      pricingOutput={pricingOutput}
      capabilityIcons={capabilityIcons}
      labels={{
        selected: t("common.selected"),
        disabled: t("providers.model_disabled_badge"),
        pricingNotConfigured: t("providers.model_pricing_not_configured"),
        disableToggle: t("providers.model_disable_toggle_label"),
        settings: t("providers.model_settings_button"),
      }}
      onOpenSettings={onOpenSettings}
      onToggleDisabled={(next) => void toggleDisabled(next)}
    />
  );
}
