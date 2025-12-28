"use client";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Calendar, ChevronRight, Settings2, User } from "lucide-react";
import type { ModelCardViewProps } from "./model-card-view-types";

export function ModelCardFooter({
  ownedBy,
  createdAtLabel,
  selected,
  disabled,
  canEdit,
  toggling,
  capabilityIcons,
  labels,
  onOpenSettings,
  onToggleDisabled,
}: ModelCardViewProps) {
  return (
    <div className="mt-5 flex items-center justify-between gap-4">
      <div
        className={cn(
          "flex items-center gap-4 text-xs",
          selected ? "text-primary-foreground/70" : "text-muted-foreground"
        )}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <User className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{ownedBy}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>{createdAtLabel}</span>
        </div>

        {capabilityIcons.length > 0 ? (
          <TooltipProvider>
            <div className="hidden sm:flex items-center gap-1.5">
              {capabilityIcons.map(({ key, Icon, label }) => (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "rounded-xl border p-1",
                        selected
                          ? "bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground/80"
                          : "bg-muted/50 border-border/60 text-muted-foreground"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{label}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        ) : null}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {canEdit ? (
          <div
            className={cn(
              "flex items-center gap-2 rounded-2xl border px-3 py-2",
              "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity",
              selected
                ? "bg-primary-foreground/10 border-primary-foreground/20"
                : "bg-muted/30 border-border/60"
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <span
              className={cn(
                "text-xs",
                selected ? "text-primary-foreground/70" : "text-muted-foreground"
              )}
            >
              {labels.disableToggle}
            </span>
            <Switch
              checked={disabled}
              onCheckedChange={(checked) => onToggleDisabled(Boolean(checked))}
              disabled={toggling}
            />
          </div>
        ) : null}

        <Button
          variant={selected ? "secondary" : "ghost"}
          size="icon"
          className={cn(
            "rounded-2xl",
            "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity",
            selected &&
              "bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/15"
          )}
          aria-label={labels.settings}
          onClick={(event) => {
            event.stopPropagation();
            onOpenSettings();
          }}
        >
          <Settings2 className="h-4 w-4" />
        </Button>
        <ChevronRight
          className={cn(
            "h-4 w-4",
            "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity",
            selected ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        />
      </div>
    </div>
  );
}
