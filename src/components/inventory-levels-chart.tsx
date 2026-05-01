"use client";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "./chart";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

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
    label: "In Stock",
    color: "#18181b",
  },
} satisfies ChartConfig;

export function InventoryLevelsChart({ selectedTimeframe }: InventoryLevelsChartProps) {
  const chartData = inventoryChartDataByTimeframe[selectedTimeframe];

  return (
    <section className="flex flex-col rounded-xl border border-zinc-200 bg-white px-4 py-10 shadow-sm md:px-6">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-zinc-500">
        Ingredient Levels
      </h2>
      <ChartContainer config={inventoryChartConfig} className="h-56 w-full">
        <BarChart accessibilityLayer data={chartData} margin={{ top: 6, right: 8, left: 8, bottom: 2 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="ingredient" tickLine={false} tickMargin={10} axisLine={false} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="inStock" fill="var(--color-inStock)" radius={6} />
        </BarChart>
      </ChartContainer>
    </section>
  );
}
