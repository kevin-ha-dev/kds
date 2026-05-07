"use client";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "./chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { CHART_BRAND_PRIMARY } from "./chart-brand";

type Timeframe = "Today" | "Week" | "Month" | "Year";

type BurgersSoldChartProps = {
  selectedTimeframe: Timeframe;
};

const burgersSoldByTimeframe: Record<Timeframe, Array<{ period: string; sold: number }>> = {
  Today: [
    { period: "9 AM", sold: 9 },
    { period: "11 AM", sold: 24 },
    { period: "1 PM", sold: 32 },
    { period: "3 PM", sold: 27 },
    { period: "5 PM", sold: 35 },
    { period: "7 PM", sold: 21 },
  ],
  Week: [
    { period: "Mon", sold: 118 },
    { period: "Tue", sold: 132 },
    { period: "Wed", sold: 121 },
    { period: "Thu", sold: 146 },
    { period: "Fri", sold: 159 },
    { period: "Sat", sold: 184 },
    { period: "Sun", sold: 138 },
  ],
  Month: [
    { period: "W1", sold: 811 },
    { period: "W2", sold: 856 },
    { period: "W3", sold: 904 },
    { period: "W4", sold: 879 },
  ],
  Year: [
    { period: "Jan", sold: 3240 },
    { period: "Mar", sold: 3385 },
    { period: "May", sold: 3578 },
    { period: "Jul", sold: 3721 },
    { period: "Sep", sold: 3650 },
    { period: "Nov", sold: 3894 },
  ],
};

const burgersSoldChartConfig = {
  sold: {
    label: "Burgers Sold",
    color: CHART_BRAND_PRIMARY,
  },
} satisfies ChartConfig;

const SOLD_FILL_GRADIENT_ID = "fill-sold";

export function BurgersSoldChart({ selectedTimeframe }: BurgersSoldChartProps) {
  const chartData = burgersSoldByTimeframe[selectedTimeframe];
  const totalBurgersSold = chartData.reduce((sum, entry) => sum + entry.sold, 0);

  return (
    <section className="flex flex-col rounded-xl border border-zinc-200 bg-white px-4 py-10 shadow-sm md:px-6">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Burgers Sold
        </h2>
        <p className="text-sm font-semibold text-zinc-700">
          Total: <span className="text-zinc-900">{totalBurgersSold.toLocaleString()}</span>
        </p>
      </div>
      <ChartContainer config={burgersSoldChartConfig} className="h-56 w-full">
        <AreaChart accessibilityLayer data={chartData} margin={{ top: 6, right: 8, left: 8, bottom: 2 }}>
          <defs>
            <linearGradient id={SOLD_FILL_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-sold)" stopOpacity={0.8} />
              <stop offset="95%" stopColor="var(--color-sold)" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="period" tickLine={false} tickMargin={10} axisLine={false} />
          <YAxis domain={[0, "auto"]} tickLine={false} axisLine={false} />
          <ChartTooltip
            cursor={false}
            shared={false}
            content={<ChartTooltipContent />}
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Area
            type="monotone"
            dataKey="sold"
            stroke="var(--color-sold)"
            strokeWidth={3}
            fill={`url(#${SOLD_FILL_GRADIENT_ID})`}
            dot={{ r: 4, fill: "var(--color-sold)" }}
            activeDot={{ r: 6, fill: "var(--color-sold)" }}
            baseLine={0}
          />
        </AreaChart>
      </ChartContainer>
    </section>
  );
}
