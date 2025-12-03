"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Zap, Clock, TrendingUp } from "lucide-react";

interface MetricProps {
    title: string;
    value: string;
    change: string;
    icon: React.ElementType;
}

interface MetricsCardsProps {
    metrics: MetricProps[];
}

function Metric({ title, value, change, icon: Icon }: MetricProps) {
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                            {title}
                        </p>
                        <h3 className="text-2xl font-bold mt-2">{value}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{change} vs last hour</p>
                    </div>
                    <div className="p-2 bg-muted rounded">
                        <Icon className="w-5 h-5" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map((metric, index) => (
                <Metric
                    key={index}
                    title={metric.title}
                    value={metric.value}
                    change={metric.change}
                    icon={metric.icon}
                />
            ))}
        </div>
    );
}