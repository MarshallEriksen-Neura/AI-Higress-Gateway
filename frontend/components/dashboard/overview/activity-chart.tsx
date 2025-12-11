"use client";

import { useI18n } from "@/lib/i18n-context";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface ChartDataPoint {
  time: string;
  total: number;
  errors: number;
  successRate: number;
}

interface ActivityChartProps {
  data: ChartDataPoint[];
}

export function ActivityChart({ data }: ActivityChartProps) {
  const { t } = useI18n();

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 8, right: 16, top: 16 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
            }}
            formatter={(value, name) => {
              if (name === "total") {
                return [value, t("chart.requests")];
              }
              if (name === "errors") {
                return [value, t("chart.errors")];
              }
              if (name === "successRate") {
                return [`${(Number(value) * 100).toFixed(1)}%`, t("chart.success_rate")];
              }
              return [value, name];
            }}
            labelFormatter={(label) => `${label}`}
          />
          <Area
            type="monotone"
            dataKey="total"
            name="total"
            stroke="#16a34a"
            fill="#16a34a33"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
          <Area
            type="monotone"
            dataKey="errors"
            name="errors"
            stroke="#ef4444"
            fill="#ef444433"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
