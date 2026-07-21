"use client";

import * as React from "react";
import { Label, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { STATUS_STYLES } from "@/lib/data/constants";
import type { StatusSlice } from "@/lib/data/types";

export function StatusDonut({ data }: { data: StatusSlice[] }) {
  const total = React.useMemo(
    () => data.reduce((sum, d) => sum + d.count, 0),
    [data],
  );

  const chartData = data.map((d) => ({
    status: d.status,
    label: STATUS_STYLES[d.status].label,
    count: d.count,
    fill: STATUS_STYLES[d.status].chart,
  }));

  const config: ChartConfig = Object.fromEntries(
    data.map((d) => [
      d.status,
      { label: STATUS_STYLES[d.status].label, color: STATUS_STYLES[d.status].chart },
    ]),
  );

  return (
    <div className="flex flex-col items-center gap-4">
      <ChartContainer config={config} className="aspect-square h-[200px]">
        <PieChart>
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <Pie
            data={chartData}
            dataKey="count"
            nameKey="label"
            innerRadius={62}
            outerRadius={90}
            strokeWidth={3}
            stroke="var(--card)"
            paddingAngle={2}
          >
            <Label
              content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return (
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      <tspan
                        x={viewBox.cx}
                        y={viewBox.cy}
                        className="fill-foreground text-3xl font-semibold"
                      >
                        {total}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy ?? 0) + 22}
                        className="fill-muted-foreground text-xs"
                      >
                        Tickets
                      </tspan>
                    </text>
                  );
                }
                return null;
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>

      <div className="grid w-full grid-cols-2 gap-x-4 gap-y-2">
        {chartData.map((d) => (
          <div key={d.status} className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-sm"
              style={{ background: d.fill }}
            />
            <span className="flex-1 truncate text-muted-foreground">
              {d.label}
            </span>
            <span className="tnum font-medium">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
