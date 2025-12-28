"use client";

import type { LucideIcon } from "lucide-react";

export interface ModelCardViewProps {
  displayName: string;
  modelId: string;
  ownedBy: string;
  createdAtLabel: string;
  selected: boolean;
  disabled: boolean;
  canEdit: boolean;
  toggling: boolean;
  pricingInput: number | null;
  pricingOutput: number | null;
  capabilityIcons: Array<{ key: string; Icon: LucideIcon; label: string }>;
  labels: {
    selected: string;
    disabled: string;
    pricingNotConfigured: string;
    disableToggle: string;
    settings: string;
  };
  onOpenSettings: () => void;
  onToggleDisabled: (nextDisabled: boolean) => void;
}
