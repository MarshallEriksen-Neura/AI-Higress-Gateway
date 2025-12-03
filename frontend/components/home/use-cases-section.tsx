"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n-context";

export function UseCasesSection() {
  const { t } = useI18n();

  return (
    <section className="container mx-auto px-6 py-16 max-w-6xl">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">{t("home.use_cases_title")}</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-xl font-semibold mb-3">{t("home.use_case.enterprise.title")}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>{t("home.use_case.enterprise.item1")}</li>
              <li>{t("home.use_case.enterprise.item2")}</li>
              <li>{t("home.use_case.enterprise.item3")}</li>
              <li>{t("home.use_case.enterprise.item4")}</li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-xl font-semibold mb-3">{t("home.use_case.developer.title")}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>{t("home.use_case.developer.item1")}</li>
              <li>{t("home.use_case.developer.item2")}</li>
              <li>{t("home.use_case.developer.item3")}</li>
              <li>{t("home.use_case.developer.item4")}</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}