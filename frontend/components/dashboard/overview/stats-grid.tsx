"use client";

import React from "react";
import { StatCard } from "../common";
import { Activity, Server, Database } from "lucide-react";

const stats = [
    {
        titleKey: "overview.total_requests",
        value: "1.2M",
        change: "+12.5%",
        trend: "up" as const,
        icon: Activity,
    },
    {
        titleKey: "overview.active_providers",
        value: "8",
        change: "+2",
        trend: "up" as const,
        icon: Server,
    },
    {
        titleKey: "overview.cache_hit_rate",
        value: "94.2%",
        change: "-0.5%",
        trend: "down" as const,
        icon: Database,
    },
];

export function StatsGrid() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stats.map((stat, index) => (
                <StatCard 
                    key={index}
                    titleKey={stat.titleKey}
                    value={stat.value}
                    change={stat.change}
                    trend={stat.trend}
                    icon={stat.icon}
                />
            ))}
        </div>
    );
}