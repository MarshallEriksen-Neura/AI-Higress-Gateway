"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { RotateCcw, Sparkles, Volume2 } from "lucide-react";
import {
  useVideoComposerStore,
  selectVideoConfig,
} from "@/lib/stores/video-composer-store";
import type { VideoResolution } from "@/lib/api-types";
import type { LogicalModel } from "@/lib/api-types";

interface VideoConfigSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  models: LogicalModel[];
}

export function VideoConfigSheet({
  open,
  onOpenChange,
  models,
}: VideoConfigSheetProps) {
  const config = useVideoComposerStore(selectVideoConfig);
  const {
    setModel,
    setResolution,
    setDuration,
    setNegativePrompt,
    setSeed,
    setFps,
    setEnhancePrompt,
    setGenerateAudio,
    resetConfig,
  } = useVideoComposerStore();

  const resolutionOptions: { value: VideoResolution; label: string }[] = [
    { value: "480p", label: "480p (SD)" },
    { value: "720p", label: "720p (HD)" },
    { value: "1080p", label: "1080p (FHD)" },
  ];

  const durationOptions = [5, 8, 10, 12];
  const fpsOptions = [16, 24, 30];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Advanced Settings
          </SheetTitle>
          <SheetDescription>
            Configure video generation parameters
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select value={config.model} onValueChange={setModel}>
              <SelectTrigger id="model">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Resolution */}
          <div className="space-y-2">
            <Label htmlFor="resolution">Resolution</Label>
            <Select
              value={config.resolution}
              onValueChange={(v) => setResolution(v as VideoResolution)}
            >
              <SelectTrigger id="resolution">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {resolutionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label>Duration: {config.duration}s</Label>
            <div className="flex gap-2">
              {durationOptions.map((d) => (
                <Button
                  key={d}
                  variant={config.duration === d ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDuration(d)}
                >
                  {d}s
                </Button>
              ))}
            </div>
          </div>

          {/* FPS */}
          <div className="space-y-2">
            <Label>Frame Rate: {config.fps} FPS</Label>
            <div className="flex gap-2">
              {fpsOptions.map((f) => (
                <Button
                  key={f}
                  variant={config.fps === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFps(f)}
                >
                  {f}
                </Button>
              ))}
            </div>
          </div>

          {/* Seed */}
          <div className="space-y-2">
            <Label htmlFor="seed">Seed (optional)</Label>
            <div className="flex gap-2">
              <Input
                id="seed"
                type="number"
                min={0}
                placeholder="Random"
                value={config.seed ?? ""}
                onChange={(e) =>
                  setSeed(e.target.value ? Number(e.target.value) : undefined)
                }
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSeed(Math.floor(Math.random() * 4294967295))}
                title="Generate random seed"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use same seed for reproducible results
            </p>
          </div>

          {/* Negative Prompt */}
          <div className="space-y-2">
            <Label htmlFor="negative-prompt">Negative Prompt</Label>
            <Textarea
              id="negative-prompt"
              placeholder="Things to avoid in the video..."
              value={config.negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Enhance Prompt */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enhance-prompt" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Enhance Prompt
              </Label>
              <p className="text-xs text-muted-foreground">
                AI will improve your prompt for better results
              </p>
            </div>
            <Switch
              id="enhance-prompt"
              checked={config.enhancePrompt}
              onCheckedChange={setEnhancePrompt}
            />
          </div>

          {/* Generate Audio */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="generate-audio" className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                Generate Audio
              </Label>
              <p className="text-xs text-muted-foreground">
                Add AI-generated sound effects
              </p>
            </div>
            <Switch
              id="generate-audio"
              checked={config.generateAudio}
              onCheckedChange={setGenerateAudio}
            />
          </div>

          {/* Reset Button */}
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={resetConfig}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
