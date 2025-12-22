"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Keyboard } from "lucide-react";

import { useI18n } from "@/lib/i18n-context";
import { useUserPreferencesStore } from "@/lib/stores/user-preferences-store";

export function ChatSettingsPreferences() {
  const { t } = useI18n();
  const { preferences, updatePreferences } = useUserPreferencesStore();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-muted-foreground" />
            <CardTitle>{t("chat.settings.preferences.title")}</CardTitle>
          </div>
          <CardDescription>
            {t("chat.settings.preferences.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 发送快捷键设置 */}
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">
                {t("chat.settings.preferences.send_shortcut")}
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                {t("chat.settings.preferences.send_shortcut_help")}
              </p>
            </div>

            <RadioGroup
              value={preferences.sendShortcut}
              onValueChange={(value: "enter" | "ctrl-enter") => {
                updatePreferences({ sendShortcut: value });
              }}
              className="space-y-3"
            >
              {/* Enter 键发送 */}
              <div className="flex items-start space-x-3 rounded-lg border border-border/40 p-4 hover:bg-muted/30 transition-colors">
                <RadioGroupItem value="enter" id="send-enter" className="mt-0.5" />
                <div className="flex-1 space-y-1">
                  <Label
                    htmlFor="send-enter"
                    className="text-sm font-medium cursor-pointer"
                  >
                    {t("chat.settings.preferences.send_shortcut_enter")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("chat.settings.preferences.send_shortcut_enter_desc")}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-mono bg-muted px-2 py-1 rounded">
                  <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px]">
                    Enter
                  </kbd>
                </div>
              </div>

              {/* Ctrl+Enter 发送 */}
              <div className="flex items-start space-x-3 rounded-lg border border-border/40 p-4 hover:bg-muted/30 transition-colors">
                <RadioGroupItem value="ctrl-enter" id="send-ctrl-enter" className="mt-0.5" />
                <div className="flex-1 space-y-1">
                  <Label
                    htmlFor="send-ctrl-enter"
                    className="text-sm font-medium cursor-pointer"
                  >
                    {t("chat.settings.preferences.send_shortcut_ctrl_enter")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("chat.settings.preferences.send_shortcut_ctrl_enter_desc")}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-mono bg-muted px-2 py-1 rounded">
                  <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px]">
                    Ctrl
                  </kbd>
                  <span>+</span>
                  <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px]">
                    Enter
                  </kbd>
                </div>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
