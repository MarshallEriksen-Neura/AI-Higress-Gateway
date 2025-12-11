"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n-context";
import { toast } from "sonner";
import {
    useActiveRegistrationWindow,
    useCloseRegistrationWindow,
} from "@/lib/swr/use-registration-windows";
import { RegistrationWindowDialog } from "@/components/system/users/registration-window-dialog";

export function RegistrationWindowCard() {
    const { t } = useI18n();
    const { window: activeWindow, loading: registrationLoading, refresh: refreshRegistrationWindow } = useActiveRegistrationWindow();
    const { closeWindow, closing: closingWindow } = useCloseRegistrationWindow();

    const [startTimeLocal, setStartTimeLocal] = useState<string>(() => {
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, "0");
        return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    });

    const [endTimeLocal, setEndTimeLocal] = useState<string>(() => {
        const later = new Date(Date.now() + 60 * 60 * 1000);
        const pad = (n: number) => n.toString().padStart(2, "0");
        return `${later.getFullYear()}-${pad(later.getMonth() + 1)}-${pad(later.getDate())}T${pad(later.getHours())}:${pad(later.getMinutes())}`;
    });

    const [maxRegistrations, setMaxRegistrations] = useState<string>("100");
    const [createDialogMode, setCreateDialogMode] = useState<"auto" | "manual" | null>(null);

    const handleCloseWindow = async () => {
        if (!activeWindow) return;
        try {
            await closeWindow(activeWindow.id);
            await refreshRegistrationWindow();
            toast.success(t("users.registration.close_success"));
        } catch (error: any) {
            const message = error?.response?.data?.detail?.message || error?.response?.data?.detail || error?.message || t("users.registration.close_error");
            toast.error(message);
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>{t("users.registration.title")}</CardTitle>
                    <CardDescription>{t("users.registration.subtitle")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-medium">{t("users.registration.current_status")}</p>
                            <p className="text-sm text-muted-foreground">
                                {registrationLoading
                                    ? t("common.loading")
                                    : activeWindow
                                    ? t("users.registration.status_open")
                                    : t("users.registration.status_closed")}
                            </p>
                        </div>
                        {activeWindow && (
                            <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                    {activeWindow.auto_activate
                                        ? t("users.registration.mode_auto")
                                        : t("users.registration.mode_manual")}
                                </Badge>
                                <Button variant="destructive" size="sm" disabled={closingWindow} onClick={handleCloseWindow}>
                                    {closingWindow ? t("common.saving") : t("users.registration.close_now")}
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t("users.registration.window_start")}</label>
                            <Input
                                type="datetime-local"
                                value={startTimeLocal}
                                onChange={(e) => setStartTimeLocal(e.target.value)}
                                placeholder={t("users.registration.form_start_placeholder")}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t("users.registration.window_end")}</label>
                            <Input
                                type="datetime-local"
                                value={endTimeLocal}
                                onChange={(e) => setEndTimeLocal(e.target.value)}
                                placeholder={t("users.registration.form_end_placeholder")}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t("users.registration.max_registrations")}</label>
                            <Input
                                type="number"
                                min={1}
                                value={maxRegistrations}
                                onChange={(e) => setMaxRegistrations(e.target.value)}
                                placeholder={t("users.registration.form_max_placeholder")}
                            />
                        </div>
                    </div>

                    {activeWindow ? (
                        <p className="text-xs text-muted-foreground">
                            {t("users.registration.registered_count")}: {activeWindow.registered_count} / {activeWindow.max_registrations}
                        </p>
                    ) : (
                        <p className="text-xs text-muted-foreground">{t("users.registration.no_active_window")}</p>
                    )}

                    <p className="text-xs text-muted-foreground">{t("users.registration.form_hint")}</p>

                    <div className="flex flex-wrap gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={() => setCreateDialogMode("manual")}>
                            {t("users.registration.create_manual")}
                        </Button>
                        <Button size="sm" onClick={() => setCreateDialogMode("auto")}>
                            {t("users.registration.create_auto")}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <RegistrationWindowDialog
                open={!!createDialogMode}
                onOpenChange={(open) => !open && setCreateDialogMode(null)}
                mode={createDialogMode}
                startTimeLocal={startTimeLocal}
                endTimeLocal={endTimeLocal}
                maxRegistrations={maxRegistrations}
                onStartTimeChange={setStartTimeLocal}
                onEndTimeChange={setEndTimeLocal}
                onMaxRegistrationsChange={setMaxRegistrations}
                onSuccess={async () => {
                    await refreshRegistrationWindow();
                    setCreateDialogMode(null);
                }}
            />
        </>
    );
}
