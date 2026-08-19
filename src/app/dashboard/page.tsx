"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowUp, DollarSign, ShoppingBag, TriangleAlert } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Navbar, Skeleton } from "@/components";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/charts/chart";
import { parseResponseJson } from "@/lib/parse-response-json";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import type { CompletedOrder, CompletedOrdersResponse } from "@/types/order";

const timeframeOptions = ["Today", "Week", "Month", "Year"] as const;
type Timeframe = (typeof timeframeOptions)[number];

const REVENUE_COLOR = "#e9b94f";
const REVENUE_FILL_GRADIENT_ID = "fill-revenue";

const revenueByTimeframe: Record<Timeframe, Array<{ period: string; revenue: number }>> = {
  Today: [
    { period: "9 AM", revenue: 420 },
    { period: "11 AM", revenue: 980 },
    { period: "1 PM", revenue: 1520 },
    { period: "3 PM", revenue: 1180 },
    { period: "5 PM", revenue: 1680 },
    { period: "7 PM", revenue: 910 },
  ],
  Week: [
    { period: "Mon", revenue: 4200 },
    { period: "Tue", revenue: 4780 },
    { period: "Wed", revenue: 4410 },
    { period: "Thu", revenue: 5230 },
    { period: "Fri", revenue: 6120 },
    { period: "Sat", revenue: 7040 },
    { period: "Sun", revenue: 5290 },
  ],
  Month: [
    { period: "W1", revenue: 21500 },
    { period: "W2", revenue: 23800 },
    { period: "W3", revenue: 25200 },
    { period: "W4", revenue: 24100 },
  ],
  Year: [
    { period: "Jan", revenue: 82400 },
    { period: "Mar", revenue: 88500 },
    { period: "May", revenue: 93200 },
    { period: "Jul", revenue: 101800 },
    { period: "Sep", revenue: 98600 },
    { period: "Nov", revenue: 108400 },
  ],
};

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

const formatCompletedTime = (isoDate: string) =>
  new Date(isoDate).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

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
          className={`mt-1 flex w-full items-center justify-start gap-1 truncate text-2xl font-bold tracking-tight ${valueClassName ?? "text-zinc-900"}`}
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

const CompletedRowSkeleton = () => (
  <tr className="border-b border-zinc-100">
    <td className="py-3 pr-4">
      <Skeleton className="h-3.5 w-28" tone="strong" />
    </td>
    <td className="py-3 pr-4">
      <Skeleton className="ml-auto h-3.5 w-6" />
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
  const [, setErrorBanner] = useState<string | null>(null);

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

  const revenueData = revenueByTimeframe[selectedTimeframe];
  const totalRevenue = revenueData.reduce((sum, entry) => sum + entry.revenue, 0);
  const failedOrders = completedOrders.filter((order) => order.status === "failed").length;
  const productSales = completedOrders.length - failedOrders;

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
                valueClassName="text-emerald-600"
                trend="up"
                isLoading={isLoading}
              />
              <StatCard
                label="Product Sales"
                value={productSales.toLocaleString()}
                icon={<ShoppingBag className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />}
                isLoading={isLoading}
              />
              <StatCard
                label="Failed Orders"
                value={failedOrders.toLocaleString()}
                icon={<TriangleAlert className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />}
                isLoading={isLoading}
              />
            </div>

            <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-zinc-200 bg-white px-4 py-4 shadow-sm md:px-6">
              <div className="mb-3 flex shrink-0 justify-end">
                <div>
                  <label htmlFor="dashboard-timeframe" className="sr-only">
                    Select dashboard timeframe
                  </label>
                  <select
                    id="dashboard-timeframe"
                    value={selectedTimeframe}
                    onChange={(event) =>
                      setSelectedTimeframe(event.target.value as (typeof timeframeOptions)[number])
                    }
                    className="h-9 min-w-36 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 shadow-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                  >
                    {timeframeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <ChartContainer config={revenueChartConfig} className="min-h-0 w-full flex-1">
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
                  <XAxis dataKey="period" tickLine={false} tickMargin={10} axisLine={false} />
                  <YAxis
                    domain={[0, "auto"]}
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
                    radius={6}
                  />
                </BarChart>
              </ChartContainer>
            </section>
          </div>

          <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex min-h-0 flex-1 flex-col px-4 py-4 md:px-5">
              <div className="mb-4 flex shrink-0 items-baseline border-b border-zinc-200 pb-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-900">
                  Completed Orders
                </h2>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <table className="w-full table-fixed border-collapse text-sm">
                  <colgroup>
                    <col />
                    <col className="w-13" />
                    <col className="w-19" />
                  </colgroup>
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-zinc-200 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      <th className="pb-3 pr-4 text-left font-semibold">Burger</th>
                      <th className="pb-3 pr-4 text-right font-semibold">Table</th>
                      <th className="pb-3 text-right font-semibold">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      Array.from({ length: 7 }, (_, index) => <CompletedRowSkeleton key={index} />)
                    ) : completedOrders.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-10 text-center text-sm text-zinc-400">
                          No completed orders yet.
                        </td>
                      </tr>
                    ) : (
                      completedOrders.map((order) => (
                        <tr key={order.id} className="border-b border-zinc-100 last:border-b-0">
                          <td className="overflow-hidden py-3 pr-4 font-medium tracking-tight text-ellipsis whitespace-nowrap text-zinc-900">
                            {order.item}
                          </td>
                          <td className="py-3 pr-4 text-right tabular-nums text-zinc-700">
                            {order.trayNumber}
                          </td>
                          <td className="py-3 whitespace-nowrap text-right tabular-nums text-zinc-500">
                            {formatCompletedTime(order.completedAt)}
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
