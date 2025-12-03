"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n-context";

export function HomeFooter() {
  const { t } = useI18n();

  return (
    <footer className="border-t mt-16">
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            {t("home.footer_copyright")}
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/dashboard/overview" className="hover:text-foreground transition-colors">
              {t("home.footer_console")}
            </Link>
            <Link href="#" className="hover:text-foreground transition-colors">
              {t("home.footer_docs")}
            </Link>
            <Link href="#" className="hover:text-foreground transition-colors">
              {t("home.footer_github")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}