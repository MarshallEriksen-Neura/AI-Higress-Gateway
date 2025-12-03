"use client";

import React from "react";
import { MetricsCards } from "@/components/dashboard/metrics/metrics-cards";
import { MetricsCharts } from "@/components/dashboard/metrics/metrics-charts";
import { ProviderPerformance } from "@/components/dashboard/metrics/provider-performance";
import { Activity, Zap, Clock, TrendingUp } from "lucide-react";

const metrics = [
    {
        title: "Requests/sec",
        value: "1,247",
        change: "+5.2%",
        icon: Activity,
    },
    {
        title: "Avg Latency",
        value: "245ms",
        change: "-12%",
        icon: Clock,
    },
    {
        title: "Success Rate",
        value: "99.8%",
        change: "+0.3%",
        icon: TrendingUp,
    },
    {
        title: "Cache Hits",
        value: "94.2%",
        change: "+1.5%",
        icon: Zap,
    },
];

export default function MetricsPage() {
    return (
        <div className="space-y-6 max-w-7xl">
            <div>
                <h1 className="text-3xl font-bold mb-2">System Metrics</h1>
                <p className="text-muted-foreground">Real-time performance monitoring</p>
            </div>

            {/* Key Metrics */}
            <MetricsCards metrics={metrics} />

            {/* Charts */}
            <MetricsCharts />

            {/* Provider Performance */}
            <ProviderPerformance />
        </div>
    );
}
