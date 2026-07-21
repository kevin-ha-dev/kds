"use client";

import { useEffect, useState } from "react";
import {
  BurgersSoldChart,
  InventoryLevelsChart,
  LiveCameraFeed,
  Navbar,
  Skeleton,
} from "@/components";
import { parseResponseJson } from "@/lib/parse-response-json";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import type { CompletedOrder, CompletedOrdersResponse } from "@/types/order";

const timeframeOptions = ["Today", "Week", "Month", "Year"] as const;
type Timeframe = (typeof timeframeOptions)[number];

/** Same column template for header, skeleton rows, and data rows (md+). */
const COMPLETED_TABLE_HEADER_GRID_CLASS =
  "hidden grid-cols-[1fr_1fr_1fr] items-center gap-4 border-b border-dotted border-zinc-300 pb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 md:grid";

const COMPLETED_TABLE_SKELETON_ROW_CLASS =
  "grid grid-cols-1 gap-2 py-3 md:grid-cols-[1fr_1fr_1fr] md:items-center md:gap-4";

const COMPLETED_TABLE_DATA_ROW_CLASS =
  "grid grid-cols-1 gap-1 py-3 text-sm text-zinc-900 md:grid-cols-[1fr_1fr_1fr] md:items-center md:gap-4";

const formatCompletedDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString([], {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
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

const CompletedRowSkeleton = () => (
  <li className={COMPLETED_TABLE_SKELETON_ROW_CLASS}>
    <Skeleton className="h-3 w-16" tone="strong" />
    <Skeleton className="h-4 w-18" />
    <Skeleton className="h-4 w-16" tone="soft" />
  </li>
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

  return (
    <main className="h-screen overflow-hidden bg-white px-6 pt-8 pb-0 text-zinc-900 lg:px-10">
      <div className="mx-auto flex h-full w-full min-h-0 max-w-384 flex-col">
        <div className="mb-4">
          <Navbar />
        </div>

        <section className="mt-4 grid grid-cols-1 gap-3 border-b border-dotted border-zinc-300 pb-4 md:grid-cols-[1fr_auto] md:items-end">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Dashboard</h1>
          <div className="justify-self-start md:justify-self-end">
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
        </section>

        <section className="mt-6 grid min-h-0 flex-1 grid-rows-[minmax(0,1.15fr)_minmax(0,1fr)] gap-5 overflow-hidden pb-6">
          <div className="grid min-h-0 grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="flex min-h-0 flex-col">
              <div className="mb-3 grid shrink-0 grid-cols-1 gap-3 border-b border-dotted border-zinc-300 pb-3 md:grid-cols-[1fr_auto] md:items-end">
                <h2 className="text-xl font-semibold tracking-tight text-zinc-900">Completed</h2>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Total: {isLoading ? "..." : completedOrders.length}
                </p>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm md:px-6 md:py-4">
                <div className={`shrink-0 ${COMPLETED_TABLE_HEADER_GRID_CLASS}`}>
                  {isLoading ? (
                    <>
                      <Skeleton className="h-3 w-14" tone="soft" />
                      <Skeleton className="h-3 w-14" tone="soft" />
                      <Skeleton className="h-3 w-10" tone="soft" />
                    </>
                  ) : (
                    <>
                      <p>Order #</p>
                      <p>Status</p>
                      <p>Date</p>
                    </>
                  )}
                </div>

                <ul className="min-h-0 flex-1 divide-y divide-zinc-200/80 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {isLoading
                    ? Array.from({ length: 6 }, (_, index) => <CompletedRowSkeleton key={index} />)
                    : completedOrders.map((order) => (
                        <li key={order.id} className={COMPLETED_TABLE_DATA_ROW_CLASS}>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 md:hidden">
                            Order #{order.id}
                          </p>
                          <p className="font-semibold md:font-medium">{order.id}</p>
                          <p>
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${
                                order.status === "failed"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {order.status}
                            </span>
                          </p>
                          <p>{formatCompletedDate(order.completedAt)}</p>
                        </li>
                      ))}
                </ul>
              </div>
            </div>

            <LiveCameraFeed className="min-h-0" />
          </div>

          <div className="grid min-h-0 grid-cols-1 gap-5 lg:grid-cols-2">
            <BurgersSoldChart selectedTimeframe={selectedTimeframe} />
            <InventoryLevelsChart selectedTimeframe={selectedTimeframe} />
          </div>
        </section>
      </div>
    </main>
  );
}
