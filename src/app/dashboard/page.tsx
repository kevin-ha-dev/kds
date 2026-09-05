"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowUp, ChevronDown, DollarSign, ShoppingBag, TriangleAlert } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Rectangle, XAxis, YAxis, type BarShapeProps } from "recharts";
import { Navbar, Skeleton } from "@/components";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/charts/chart";
import {
  bucketRevenueByTimeframe,
  filterOrdersByTimeframe,
  formatCompletedAt,
  ORDER_REVENUE_USD,
  TIMEFRAME_OPTIONS,
  type Timeframe,
} from "@/lib/dashboard-timeframe";
import { parseResponseJson } from "@/lib/parse-response-json";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import type { CompletedOrder, CompletedOrdersResponse } from "@/types/order";

const REVENUE_COLOR = "#e9b94f";
const REVENUE_FILL_GRADIENT_ID = "fill-revenue";
const TIMEFRAME_TRANSITION_MS = 360;
const CHART_SKELETON_HEIGHTS = ["38%", "58%", "44%", "72%", "51%", "64%", "41%", "55%"];

const revenueChartConfig = {
  revenue: {
    label: "Revenue",
    color: REVENUE_COLOR,
  },
} satisfies ChartConfig;

const formatCurrency = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

const formatRevenueTick = (value: number) =>
  value >= 1000 ? `$${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k` : `$${value}`;

async function loadCompletedOrdersFromApi(): Promise<CompletedOrder[]> {
  const response = await fetch("/api/orders/completed", {
    method: "POST",
  });

  const data = await parseResponseJson<CompletedOrdersResponse>(response);

  if (!data) {
    throw new Error(
      `Failed to load completed orders. Non-JSON response received (status=${response.status}).`,
    );
  }

  if (!response.ok || !data.success) {
    throw new Error(data.error ?? "Failed to load completed orders.");
  }

  return data.orders ?? [];
}

type StatCardProps = {
  label: string;
  value: string;
  icon: ReactNode;
  isLoading: boolean;
  valueClassName?: string;
  trend?: "up";
};

const StatCard = ({ label, value, icon, isLoading, valueClassName, trend }: StatCardProps) => (
  <div className="flex min-h-24 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
    <div className="flex min-w-0 w-full flex-col items-start px-4 py-5">
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-zinc-500">{icon}</span>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      </div>
      {isLoading ? (
        <Skeleton className="mt-2 h-7 w-24" tone="strong" />
      ) : (
        <p
          key={value}
          className={`kds-fade-in mt-1 flex w-full items-center justify-start gap-1 truncate text-2xl tracking-tight ${valueClassName ?? "font-bold text-zinc-900"}`}
        >
          <span className="truncate">{value}</span>
          {trend === "up" ? (
            <ArrowUp className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
          ) : null}
        </p>
      )}
    </div>
  </div>
);

function RevenueBarShape({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  fill,
  stroke,
  strokeWidth,
}: BarShapeProps) {
  if (height <= 0 || width <= 0) {
    return null;
  }

  return (
    <Rectangle
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      radius={[6, 6, 0, 0]}
    />
  );
}

const ChartSkeleton = () => (
  <div className="flex min-h-0 w-full flex-1 items-end gap-2.5 px-8 pb-8 pt-6" aria-hidden>
    {CHART_SKELETON_HEIGHTS.map((height, index) => (
      <div key={index} className="min-h-0 w-full flex-1" style={{ height }}>
        <Skeleton
          className="h-full w-full rounded-t-md rounded-b-sm"
          tone={index % 2 === 0 ? "base" : "soft"}
        />
      </div>
    ))}
  </div>
);

const CompletedRowSkeleton = () => (
  <tr className="border-b border-zinc-100">
    <td className="py-3 pr-4">
      <Skeleton className="h-3.5 w-28" tone="strong" />
    </td>
    <td className="py-3 pr-4">
      <Skeleton className="h-3.5 w-6" />
    </td>
    <td className="py-3">
      <Skeleton className="ml-auto h-3.5 w-14" tone="soft" />
    </td>
  </tr>
);

export default function DashboardPage() {
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>("Today");
  const [completedOrders, setCompletedOrders] = useState<CompletedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTimeframeLoading, setIsTimeframeLoading] = useState(false);
  const [, setErrorBanner] = useState<string | null>(null);

  const showLoading = isLoading || isTimeframeLoading;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const refreshOrders = async () => {
      const orders = await loadCompletedOrdersFromApi();
      setCompletedOrders(orders);
    };

    const loadInitial = async () => {
      try {
        await refreshOrders();
        setErrorBanner(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load completed orders.";
        setErrorBanner(message);
        console.error("Load completed orders failed", error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadInitial();

    const { client, error } = getBrowserSupabaseClient();
    if (!client) {
      setErrorBanner(error);
      return;
    }

    const channel = client
      .channel("dashboard-completed-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          void refreshOrders().then(
            () => setErrorBanner(null),
            (fetchError) => {
              const message =
                fetchError instanceof Error
                  ? fetchError.message
                  : "Failed to refresh completed orders from realtime updates.";
              setErrorBanner(message);
            },
          );
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setErrorBanner(null);
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setErrorBanner("Realtime connection dropped. Attempting to reconnect...");
        }
      });

    return () => {
      void client.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!isTimeframeLoading) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsTimeframeLoading(false);
    }, TIMEFRAME_TRANSITION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isTimeframeLoading, selectedTimeframe]);

  const handleTimeframeChange = (nextTimeframe: Timeframe) => {
    if (nextTimeframe === selectedTimeframe) {
      return;
    }

    setSelectedTimeframe(nextTimeframe);
    if (!isLoading) {
      setIsTimeframeLoading(true);
    }
  };

  const filteredOrders = useMemo(
    () => filterOrdersByTimeframe(completedOrders, selectedTimeframe),
    [completedOrders, selectedTimeframe],
  );
  const revenueData = useMemo(
    () => bucketRevenueByTimeframe(completedOrders, selectedTimeframe),
    [completedOrders, selectedTimeframe],
  );
  const failedOrders = filteredOrders.filter((order) => order.status === "failed").length;
  const productSales = filteredOrders.length - failedOrders;
  const totalRevenue = productSales * ORDER_REVENUE_USD;

  return (
    <main className="h-screen overflow-hidden bg-white px-6 pt-8 pb-0 text-zinc-900 lg:px-10">
      <div className="flex h-full w-full min-h-0 flex-col">
        <div className="mb-4">
          <Navbar />
        </div>

        <section className="mt-6 grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-hidden pb-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
          <div className="flex min-h-0 flex-col gap-5">
            <div className="grid shrink-0 grid-cols-1 gap-5 sm:grid-cols-3">
              <StatCard
                label="Revenue"
                value={formatCurrency(totalRevenue)}
                icon={<DollarSign className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />}
                valueClassName="font-semibold text-[#2fbf45]"
                isLoading={showLoading}
              />
              <StatCard
                label="Product Sales"
                value={productSales.toLocaleString()}
                icon={<ShoppingBag className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />}
                isLoading={showLoading}
              />
              <StatCard
                label="Failed Orders"
                value={failedOrders.toLocaleString()}
                icon={<TriangleAlert className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />}
                valueClassName="font-semibold text-[#d96a6a]"
                isLoading={showLoading}
              />
            </div>

            <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-zinc-200 bg-white px-4 py-4 shadow-sm md:px-6">
              {showLoading ? (
                <ChartSkeleton />
              ) : (
                <ChartContainer
                  key={selectedTimeframe}
                  config={revenueChartConfig}
                  className="kds-fade-in min-h-0 w-full flex-1"
                >
                <BarChart
                  accessibilityLayer
                  data={revenueData}
                  margin={{ top: 6, right: 8, left: 0, bottom: 2 }}
                >
                  <defs>
                    <linearGradient id={REVENUE_FILL_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.85} />
                      <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.15} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="period"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    interval={0}
                  />
                  <YAxis
                    domain={[0, (dataMax: number) => Math.max(dataMax, ORDER_REVENUE_USD)]}
                    tickLine={false}
                    axisLine={false}
                    width={52}
                    tickFormatter={formatRevenueTick}
                    tick={{ fontSize: 11, fill: "#71717a" }}
                  />
                  <ChartTooltip
                    cursor={false}
                    shared={false}
                    formatter={(value) => formatCurrency(Number(value))}
                    content={<ChartTooltipContent />}
                  />
                  <Bar
                    dataKey="revenue"
                    fill={`url(#${REVENUE_FILL_GRADIENT_ID})`}
                    stroke="var(--color-revenue)"
                    strokeWidth={1}
                    isAnimationActive={false}
                    shape={RevenueBarShape}
                    activeBar={false}
                  />
                </BarChart>
                </ChartContainer>
              )}
            </section>
          </div>

          <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex min-h-0 flex-1 flex-col px-4 py-4 md:px-5">
              <div className="mb-4 flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200 pb-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-900">
                  Completed Orders
                </h2>
                <div className="relative">
                  <label htmlFor="dashboard-timeframe" className="sr-only">
                    Select dashboard timeframe
                  </label>
                  <select
                    id="dashboard-timeframe"
                    value={selectedTimeframe}
                    onChange={(event) => handleTimeframeChange(event.target.value as Timeframe)}
                    className="h-8 min-w-28 appearance-none rounded-md border border-zinc-200 bg-zinc-50 py-0 pr-7 pl-2.5 text-sm font-medium text-zinc-700 outline-none transition hover:border-zinc-300 hover:bg-white focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-200"
                  >
                    {TIMEFRAME_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
                    strokeWidth={2}
                    aria-hidden
                  />
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <table className="w-full table-fixed border-collapse text-sm">
                  <colgroup>
                    <col />
                    <col className="w-13" />
                    <col className={selectedTimeframe === "Today" ? "w-19" : "w-28"} />
                  </colgroup>
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-zinc-200 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      <th className="pb-3 pr-4 text-left font-semibold">Burger</th>
                      <th className="pb-3 pr-4 text-left font-semibold">Table</th>
                      <th className="pb-3 text-right font-semibold">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {showLoading ? (
                      Array.from({ length: 7 }, (_, index) => <CompletedRowSkeleton key={index} />)
                    ) : filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="kds-fade-in py-10 text-center text-sm text-zinc-400">
                          No completed orders in this period.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => (
                        <tr
                          key={order.id}
                          className="kds-fade-in border-b border-zinc-100 last:border-b-0"
                        >
                          <td className="overflow-hidden py-3 pr-4 font-medium tracking-tight text-ellipsis whitespace-nowrap text-zinc-900">
                            {order.item}
                          </td>
                          <td className="py-3 pr-4 text-left tabular-nums text-zinc-700">
                            {order.tableNumber ?? "N/A"}
                          </td>
                          <td className="py-3 whitespace-nowrap text-right tabular-nums text-zinc-500">
                            {formatCompletedAt(order.completedAt, selectedTimeframe)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
