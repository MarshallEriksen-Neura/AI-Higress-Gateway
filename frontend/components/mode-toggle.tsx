"use client"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useI18n } from "@/lib/i18n-context"
import { InkButton } from "@/components/ink/ink-button"

export function ModeToggle() {
    const { setTheme, theme } = useTheme()
    const { language, setLanguage, t } = useI18n()

    return (
        <div className="fixed top-4 right-4 z-50 flex gap-2">
            <InkButton
                variant="ghost"
                size="icon"
                onClick={() => setLanguage(language === "en" ? "zh" : "en")}
                title={t("common.switch_language")}
                className="w-10 h-10 p-0 rounded-full border border-border bg-background/50 backdrop-blur-sm"
            >
                <span className="font-serif font-bold text-lg">
                    {language === "en" ? "中" : "En"}
                </span>
            </InkButton>

            <InkButton
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                title={t("common.toggle_theme")}
                className="w-10 h-10 p-0 rounded-full border border-border bg-background/50 backdrop-blur-sm"
            >
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">{t("common.toggle_theme")}</span>
            </InkButton>
        </div>
    )
}
