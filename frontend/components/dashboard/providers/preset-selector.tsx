"use client";

import { useState, useMemo } from "react";
import { ProviderPreset } from "@/http/provider-preset";
import { useProviderPresets } from "@/lib/hooks/use-provider-presets";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Check, Sparkles, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n-context";

// Provider logo mapping - uses simple text-based logos for now
const DEFAULT_LOGO = { icon: "AI", color: "bg-slate-500" };

const PROVIDER_LOGOS: Record<string, { icon: string; color: string }> = {
  openai: { icon: "O", color: "bg-emerald-500" },
  anthropic: { icon: "A", color: "bg-orange-500" },
  claude: { icon: "C", color: "bg-orange-500" },
  google: { icon: "G", color: "bg-blue-500" },
  gemini: { icon: "G", color: "bg-blue-500" },
  deepseek: { icon: "D", color: "bg-indigo-500" },
  moonshot: { icon: "M", color: "bg-violet-500" },
  kimi: { icon: "K", color: "bg-violet-500" },
  qwen: { icon: "Q", color: "bg-purple-500" },
  zhipu: { icon: "Z", color: "bg-cyan-500" },
  glm: { icon: "G", color: "bg-cyan-500" },
  minimax: { icon: "M", color: "bg-pink-500" },
  baichuan: { icon: "B", color: "bg-amber-500" },
  doubao: { icon: "D", color: "bg-teal-500" },
  azure: { icon: "A", color: "bg-sky-500" },
  groq: { icon: "G", color: "bg-rose-500" },
  together: { icon: "T", color: "bg-lime-500" },
  replicate: { icon: "R", color: "bg-fuchsia-500" },
  cohere: { icon: "C", color: "bg-red-500" },
  mistral: { icon: "M", color: "bg-blue-600" },
  perplexity: { icon: "P", color: "bg-green-500" },
  fireworks: { icon: "F", color: "bg-orange-600" },
};

function getProviderLogo(presetId: string): { icon: string; color: string } {
  const normalizedId = presetId.toLowerCase();

  for (const [key, value] of Object.entries(PROVIDER_LOGOS)) {
    if (normalizedId.includes(key) && value) {
      return value;
    }
  }
  return DEFAULT_LOGO;
}

interface PresetSelectorProps {
  selectedPresetId: string | null;
  onPresetSelect: (preset: ProviderPreset | null) => void;
  disabled?: boolean;
  error?: string;
  isEditing?: boolean;
}

export function PresetSelector({
  selectedPresetId,
  onPresetSelect,
  disabled = false,
  error,
  isEditing = false,
}: PresetSelectorProps) {
  const { t } = useI18n();
  const {
    presets,
    loading: isLoading,
    error: presetsError,
  } = useProviderPresets();
  const [searchQuery, setSearchQuery] = useState("");
  const [showManualConfig, setShowManualConfig] = useState(false);

  const loadError =
    presetsError && (presetsError as any).message
      ? (presetsError as any).message
      : presetsError
      ? t("providers.preset_load_error")
      : null;

  // Filter presets
  const filteredPresets = useMemo(() => {
    if (!searchQuery) return presets;
    const query = searchQuery.toLowerCase();
    return presets.filter((preset) =>
      preset.display_name.toLowerCase().includes(query) ||
      preset.preset_id.toLowerCase().includes(query) ||
      preset.description?.toLowerCase().includes(query)
    );
  }, [presets, searchQuery]);

  // Selected preset
  const selectedPreset = useMemo(() =>
    presets.find((p) => p.preset_id === selectedPresetId),
    [presets, selectedPresetId]
  );

  const handlePresetClick = (preset: ProviderPreset) => {
    if (disabled) return;

    // Toggle selection
    if (selectedPresetId === preset.preset_id) {
      onPresetSelect(null);
    } else {
      onPresetSelect(preset);
      setShowManualConfig(false);
    }
  };

  const handleManualConfig = () => {
    if (disabled) return;
    onPresetSelect(null);
    setShowManualConfig(true);
  };

  // Show minimal UI in edit mode
  if (isEditing) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <Label className="text-base font-medium">{t("providers.preset_quick_setup")}</Label>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg border bg-muted/40"
            />
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <Label className="text-base font-medium">{t("providers.preset_quick_setup")}</Label>
        </div>
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center">
          <p className="text-sm text-destructive">{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <Label className="text-base font-medium">{t("providers.preset_quick_setup")}</Label>
        </div>
        {presets.length > 6 && (
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t("providers.preset_search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={disabled}
              className="h-8 pl-8 text-sm"
            />
          </div>
        )}
      </div>

      {/* Preset cards grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {filteredPresets.map((preset) => {
          const isSelected = selectedPresetId === preset.preset_id;
          const logo = getProviderLogo(preset.preset_id);

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetClick(preset)}
              disabled={disabled}
              className={cn(
                "group relative flex flex-col items-center gap-2 rounded-lg border p-4 transition-all",
                "hover:border-primary/50 hover:bg-accent/50",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border bg-background"
              )}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute right-2 top-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                </div>
              )}

              {/* Provider logo */}
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-lg text-lg font-bold text-white transition-transform group-hover:scale-105",
                  logo.color
                )}
              >
                {logo.icon}
              </div>

              {/* Provider name */}
              <div className="text-center">
                <span className="text-sm font-medium line-clamp-1">
                  {preset.display_name}
                </span>
              </div>
            </button>
          );
        })}

        {/* Manual config card */}
        <button
          type="button"
          onClick={handleManualConfig}
          disabled={disabled}
          className={cn(
            "group relative flex flex-col items-center gap-2 rounded-lg border border-dashed p-4 transition-all",
            "hover:border-primary/50 hover:bg-accent/50",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            showManualConfig && !selectedPresetId
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/30 bg-muted/20"
          )}
        >
          {showManualConfig && !selectedPresetId && (
            <div className="absolute right-2 top-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            </div>
          )}

          <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/40 bg-muted/50 transition-transform group-hover:scale-105">
            <Settings2 className="h-6 w-6 text-muted-foreground" />
          </div>

          <div className="text-center">
            <span className="text-sm font-medium text-muted-foreground">
              {t("providers.preset_manual_config")}
            </span>
          </div>
        </button>
      </div>

      {/* Selected preset info */}
      {selectedPreset && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white",
                getProviderLogo(selectedPreset.preset_id).color
              )}
            >
              {getProviderLogo(selectedPreset.preset_id).icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">{selectedPreset.display_name}</span>
                <Badge variant="secondary" className="text-xs">
                  {t("providers.preset_selected")}
                </Badge>
              </div>
              {selectedPreset.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {selectedPreset.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {t("providers.preset_fill_api_key_hint")}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onPresetSelect(null)}
              disabled={disabled}
              className="h-7 text-xs flex-shrink-0"
            >
              {t("providers.preset_change")}
            </Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {filteredPresets.length === 0 && searchQuery && (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {t("providers.preset_no_results")}
          </p>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
