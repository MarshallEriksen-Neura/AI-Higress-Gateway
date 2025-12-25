"use client";

import { Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";

import { DEFAULT_MODEL_PARAMETERS, type ModelParameters, type TunableModelParameterKey } from "./types";

export type ModelParametersPopoverProps = {
  disabled?: boolean;
  parameters: ModelParameters;
  onParametersChange: (next: ModelParameters) => void;
  onReset: () => void;
  title: string;
  resetLabel: string;
  labels: Record<TunableModelParameterKey, string>;
};

export function ModelParametersPopover({
  disabled = false,
  parameters,
  onParametersChange,
  onReset,
  title,
  resetLabel,
  labels,
}: ModelParametersPopoverProps) {
  const hasOverrides =
    parameters.temperature !== DEFAULT_MODEL_PARAMETERS.temperature ||
    parameters.top_p !== DEFAULT_MODEL_PARAMETERS.top_p ||
    parameters.frequency_penalty !== DEFAULT_MODEL_PARAMETERS.frequency_penalty ||
    parameters.presence_penalty !== DEFAULT_MODEL_PARAMETERS.presence_penalty;

  const setValue = (key: TunableModelParameterKey, value: number | undefined) => {
    if (value == null) return;
    onParametersChange({ ...parameters, [key]: value });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="icon-sm"
          variant={hasOverrides ? "secondary" : "ghost"}
          disabled={disabled}
          aria-label={title}
          title={title}
        >
          <Settings2 className="size-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">
                {labels.temperature}
              </Label>
              <span className="text-xs text-muted-foreground">
                {parameters.temperature.toFixed(1)}
              </span>
            </div>
            <Slider
              value={[parameters.temperature]}
              onValueChange={([v]) => setValue("temperature", v)}
              min={0}
              max={2}
              step={0.1}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">
                {labels.top_p}
              </Label>
              <span className="text-xs text-muted-foreground">
                {parameters.top_p.toFixed(1)}
              </span>
            </div>
            <Slider
              value={[parameters.top_p]}
              onValueChange={([v]) => setValue("top_p", v)}
              min={0}
              max={1}
              step={0.1}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">
                {labels.frequency_penalty}
              </Label>
              <span className="text-xs text-muted-foreground">
                {parameters.frequency_penalty.toFixed(1)}
              </span>
            </div>
            <Slider
              value={[parameters.frequency_penalty]}
              onValueChange={([v]) => setValue("frequency_penalty", v)}
              min={0}
              max={2}
              step={0.1}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">
                {labels.presence_penalty}
              </Label>
              <span className="text-xs text-muted-foreground">
                {parameters.presence_penalty.toFixed(1)}
              </span>
            </div>
            <Slider
              value={[parameters.presence_penalty]}
              onValueChange={([v]) => setValue("presence_penalty", v)}
              min={0}
              max={2}
              step={0.1}
              disabled={disabled}
            />
          </div>

          <Button size="sm" variant="outline" onClick={onReset} className="w-full" type="button">
            {resetLabel}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
