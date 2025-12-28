"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  DollarSign,
  Zap,
} from "lucide-react";
import type { ModelCardViewProps } from "./model-card-view-types";

function PricingBadge({
  inverted,
  pricingInput,
  pricingOutput,
  pricingNotConfigured,
}: {
  inverted: boolean;
  pricingInput: number | null;
  pricingOutput: number | null;
  pricingNotConfigured: string;
}) {
  if (pricingInput === null && pricingOutput === null) {
    return (
      <Badge
        variant={inverted ? "secondary" : "outline"}
        className={cn(
          "text-xs shrink-0 font-normal gap-1",
          inverted && "bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20"
        )}
      >
        <DollarSign className="h-3 w-3" />
        {pricingNotConfigured}
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {pricingInput !== null ? (
        <Badge
          variant="secondary"
          className={cn(
            "text-xs font-mono font-normal gap-1",
            inverted
              ? "bg-primary-foreground/10 text-primary-foreground border border-primary-foreground/20"
              : "bg-muted text-foreground border border-border/60"
          )}
        >
          <ArrowDownToLine className="h-3 w-3" />
          {pricingInput}
        </Badge>
      ) : null}
      {pricingOutput !== null ? (
        <Badge
          variant="secondary"
          className={cn(
            "text-xs font-mono font-normal gap-1",
            inverted
              ? "bg-primary-foreground/10 text-primary-foreground border border-primary-foreground/20"
              : "bg-muted text-foreground border border-border/60"
          )}
        >
          <ArrowUpFromLine className="h-3 w-3" />
          {pricingOutput}
        </Badge>
      ) : null}
    </div>
  );
}

export function ModelCardHeader({
  displayName,
  modelId,
  selected,
  disabled,
  pricingInput,
  pricingOutput,
  labels,
}: ModelCardViewProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <div
          className={cn(
            "h-10 w-10 rounded-2xl flex items-center justify-center border shrink-0",
            selected
              ? "bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground"
              : "bg-muted border-border/60 text-foreground"
          )}
        >
          <Zap className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-lg font-semibold leading-tight truncate">
              {displayName}
            </h3>
            {disabled ? (
              <Badge
                variant={selected ? "secondary" : "outline"}
                className={cn(
                  "text-xs font-normal",
                  selected &&
                    "bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20"
                )}
              >
                {labels.disabled}
              </Badge>
            ) : null}
          </div>
          <p
            className={cn(
              "mt-1 text-sm truncate",
              selected ? "text-primary-foreground/70" : "text-muted-foreground"
            )}
            title={modelId}
          >
            {modelId}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {selected ? (
          <Badge className="bg-emerald-500 text-white border-0 px-2.5 py-1 text-[11px] font-semibold tracking-wide">
            {labels.selected}
          </Badge>
        ) : null}
        <PricingBadge
          inverted={selected}
          pricingInput={pricingInput}
          pricingOutput={pricingOutput}
          pricingNotConfigured={labels.pricingNotConfigured}
        />
      </div>
    </div>
  );
}
