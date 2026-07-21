"use client";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "./chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { CHART_BRAND_PRIMARY } from "./chart-brand";

type Timeframe = "Today" | "Week" | "Month" | "Year";

type InventoryLevelsChartProps = {
  selectedTimeframe: Timeframe;
};

const inventoryChartDataByTimeframe: Record<
  Timeframe,
  Array<{ ingredient: string; inStock: number }>
> = {
  Today: [
    { ingredient: "Bun", inStock: 92 },
    { ingredient: "Patty", inStock: 74 },
    { ingredient: "Cheese", inStock: 68 },
    { ingredient: "Lettuce", inStock: 51 },
    { ingredient: "Tomato", inStock: 63 },
  ],
  Week: [
    { ingredient: "Bun", inStock: 86 },
    { ingredient: "Patty", inStock: 65 },
    { ingredient: "Cheese", inStock: 61 },
    { ingredient: "Lettuce", inStock: 45 },
    { ingredient: "Tomato", inStock: 57 },
  ],
  Month: [
    { ingredient: "Bun", inStock: 78 },
    { ingredient: "Patty", inStock: 54 },
    { ingredient: "Cheese", inStock: 49 },
    { ingredient: "Lettuce", inStock: 38 },
    { ingredient: "Tomato", inStock: 44 },
  ],
  Year: [
    { ingredient: "Bun", inStock: 72 },
    { ingredient: "Patty", inStock: 50 },
    { ingredient: "Cheese", inStock: 42 },
    { ingredient: "Lettuce", inStock: 33 },
    { ingredient: "Tomato", inStock: 40 },
  ],
};

const inventoryChartConfig = {
  inStock: {
    label: "In stock (%)",
    color: CHART_BRAND_PRIMARY,
  },
} satisfies ChartConfig;

const percentAxisTicks = [0, 25, 50, 75, 100] as const;

const formatPercentTick = (value: number) => `${value}%`;

/** Matches repo pattern: gradient from ChartStyle `--color-*`, not Tailwind on chart.tsx */
const IN_STOCK_FILL_GRADIENT_ID = "fill-inStock";

export function InventoryLevelsChart({ selectedTimeframe }: InventoryLevelsChartProps) {
  const chartData = inventoryChartDataByTimeframe[selectedTimeframe];

  return (
    <section className="flex h-full min-h-0 flex-col rounded-xl border border-zinc-200 bg-white px-4 py-4 shadow-sm md:px-6">
      <h2 className="mb-3 shrink-0 text-sm font-semibold uppercase tracking-[0.14em] text-zinc-500">
        Ingredient Levels
      </h2>
      <ChartContainer config={inventoryChartConfig} className="min-h-0 w-full flex-1">
        <BarChart accessibilityLayer data={chartData} margin={{ top: 6, right: 8, left: 0, bottom: 2 }}>
          <defs>
            <linearGradient id={IN_STOCK_FILL_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-inStock)" stopOpacity={0.8} />
              <stop offset="95%" stopColor="var(--color-inStock)" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="ingredient" tickLine={false} tickMargin={10} axisLine={false} />
          <YAxis
            domain={[0, 100]}
            ticks={[...percentAxisTicks]}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatPercentTick}
            width={44}
            tick={{ fontSize: 11, fill: "#71717a" }}
          />
          <ChartTooltip
            cursor={false}
            shared={false}
            formatter={(value) => `${Number(value)}%`}
            content={<ChartTooltipContent />}
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar
            dataKey="inStock"
            fill={`url(#${IN_STOCK_FILL_GRADIENT_ID})`}
            stroke="var(--color-inStock)"
            strokeWidth={1}
            radius={6}
          />
        </BarChart>
      </ChartContainer>
    </section>
  );
}
