"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { VolumePoint } from "@/lib/data/types";

const config = {
  created: { label: "Created", color: "var(--chart-1)" },
  resolved: { label: "Resolved", color: "var(--chart-3)" },
} satisfies ChartConfig;

export function VolumeChart({ data }: { data: VolumePoint[] }) {
  return (
    <ChartContainer config={config} className="h-[240px] w-full">
      <AreaChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="fillCreated" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-created)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--color-created)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fillResolved" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-resolved)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--color-resolved)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          minTickGap={28}
          className="text-xs"
          stroke="var(--muted-foreground)"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={40}
          allowDecimals={false}
          className="text-xs"
          stroke="var(--muted-foreground)"
        />
        <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
        <Area
          dataKey="created"
          type="monotone"
          fill="url(#fillCreated)"
          stroke="var(--color-created)"
          strokeWidth={2}
        />
        <Area
          dataKey="resolved"
          type="monotone"
          fill="url(#fillResolved)"
          stroke="var(--color-resolved)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
