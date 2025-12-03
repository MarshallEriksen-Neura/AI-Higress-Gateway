"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Zap, Shield, BarChart3, Network, Cpu, Key } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";

export function HomePage() {
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
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-20 pb-16 max-w-6xl">
        <div className="text-center space-y-6">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            {t("app.title")}
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
            {t("home.tagline")}
          </p>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("home.description")}
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Link href="/dashboard/overview">
              <Button size="lg" className="gap-2">
                {t("home.btn_enter_console")}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">
                {t("home.btn_get_started")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
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

      {/* Use Cases */}
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

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-16 max-w-4xl">
        <Card className="bg-muted/50">
          <CardContent className="pt-12 pb-12 text-center">
            <h2 className="text-3xl font-bold mb-4">{t("home.cta_title")}</h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t("home.cta_description")}
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/dashboard/overview">
                <Button size="lg">
                  {t("home.btn_view_demo")}
                </Button>
              </Link>
              <Link href="https://github.com" target="_blank">
                <Button variant="outline" size="lg">
                  {t("home.btn_view_docs")}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
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
    </div>
  );
}