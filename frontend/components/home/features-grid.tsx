"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Network, Cpu, Zap, Shield, BarChart3, Key } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";

export function FeaturesGrid() {
  const { t } = useI18n();

  const features = [
    {
      icon: Network,
      title: t("home.feature.smart_routing.title"),
      description: t("home.feature.smart_routing.description"),
    },
    {
      icon: Cpu,
      title: t("home.feature.multi_model.title"),
      description: t("home.feature.multi_model.description"),
    },
    {
      icon: Zap,
      title: t("home.feature.high_performance.title"),
      description: t("home.feature.high_performance.description"),
    },
    {
      icon: Shield,
      title: t("home.feature.secure_reliable.title"),
      description: t("home.feature.secure_reliable.description"),
    },
    {
      icon: BarChart3,
      title: t("home.feature.real_time_monitoring.title"),
      description: t("home.feature.real_time_monitoring.description"),
    },
    {
      icon: Key,
      title: t("home.feature.unified_interface.title"),
      description: t("home.feature.unified_interface.description"),
    },
  ];

  return (
    <section className="container mx-auto px-6 py-16 max-w-6xl">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">{t("home.features_title")}</h2>
        <p className="text-muted-foreground">
          {t("home.features_subtitle")}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <Card key={index} className="border hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex flex-col items-start space-y-3">
                <div className="p-2 bg-muted rounded">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}