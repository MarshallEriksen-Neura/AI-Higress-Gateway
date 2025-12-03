"use client";

import React, { useEffect, useState } from "react";
import { Bell, User, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useI18n } from "@/lib/i18n-context";

export function TopNav() {
    const [mounted, setMounted] = useState(false);
    const { setTheme, theme } = useTheme();
    const { language, setLanguage, t } = useI18n();

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleThemeToggle = () => {
        console.log("Theme toggle clicked, current theme:", theme);
        const newTheme = theme === "dark" ? "light" : "dark";
        console.log("Setting theme to:", newTheme);
        setTheme(newTheme);
    };

    const handleLanguageToggle = () => {
        console.log("Language toggle clicked, current language:", language);
        const newLang = language === "en" ? "zh" : "en";
        console.log("Setting language to:", newLang);
        setLanguage(newLang);
    };

    return (
        <header className="h-16 border-b bg-card flex items-center justify-end px-6">
            <div className="flex items-center space-x-2">
                {/* Language Toggle */}
                {mounted && (
                    <button
                        onClick={handleLanguageToggle}
                        className="h-9 w-9 p-0 rounded hover:bg-muted transition-colors flex items-center justify-center"
                    >
                        <span className="text-sm font-medium">
                            {language === "en" ? "中" : "En"}
                        </span>
                    </button>
                )}

                {/* Theme Toggle */}
                {mounted && (
                    <button
                        onClick={handleThemeToggle}
                        className="h-9 w-9 p-0 rounded hover:bg-muted transition-colors flex items-center justify-center relative"
                    >
                        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="sr-only">{t("common.toggle_theme")}</span>
                    </button>
                )}

                {/* Notification Bell */}
                <button className="relative p-2 rounded hover:bg-muted transition-colors">
                    <Bell className="w-5 h-5 text-muted-foreground" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
                </button>

                {/* User Profile */}
                <div className="flex items-center space-x-3 pl-4 border-l">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-medium">{t("topnav.admin_user_name")}</p>
                        <p className="text-xs text-muted-foreground">{t("topnav.admin_role")}</p>
                    </div>
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-5 h-5 text-foreground" />
                    </div>
                </div>
            </div>
        </header>
    );
}
