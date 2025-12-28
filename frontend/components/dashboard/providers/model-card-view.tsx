"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ModelCardHeader } from "./model-card-view-header";
import { ModelCardFooter } from "./model-card-view-footer";
import type { ModelCardViewProps } from "./model-card-view-types";

export function ModelCardView(props: ModelCardViewProps) {
  const { selected, onOpenSettings } = props;

  return (
    <Card
      onClick={onOpenSettings}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenSettings();
        }
      }}
      className={cn(
        "group relative overflow-hidden rounded-3xl border transition-colors",
        "cursor-pointer select-none",
        "hover:bg-muted/40",
        selected
          ? "bg-primary text-primary-foreground border-primary/40 hover:bg-primary/95"
          : "bg-card border-border/60"
      )}
    >
      <CardContent className="p-6">
        <ModelCardHeader {...props} />
        <ModelCardFooter {...props} />
      </CardContent>
    </Card>
  );
}
