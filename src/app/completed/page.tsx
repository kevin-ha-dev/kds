"use client";

import { useEffect, useState } from "react";
import { Navbar, Skeleton } from "@/components";
import { pageTitleSectionWithDottedRuleClassName } from "@/lib/page-section-classes";
import { parseResponseJson } from "@/lib/parse-response-json";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import type { CompletedOrder, CompletedOrdersResponse } from "@/types/order";

/** Same column template for header, skeleton rows, and data rows (md+). */
const COMPLETED_TABLE_HEADER_GRID_CLASS =
  "hidden grid-cols-[1.1fr_1.4fr_2.3fr_1fr_1fr_0.7fr] items-center gap-4 border-b border-dotted border-zinc-300 pb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 md:grid";

const COMPLETED_TABLE_SKELETON_ROW_CLASS =
  "grid grid-cols-1 gap-2 py-3 md:grid-cols-[1.1fr_1.4fr_2.3fr_1fr_1fr_0.7fr] md:items-center md:gap-4";

const COMPLETED_TABLE_DATA_ROW_CLASS =
  "grid grid-cols-1 gap-1 py-3 text-sm text-zinc-900 md:grid-cols-[1.1fr_1.4fr_2.3fr_1fr_1fr_0.7fr] md:items-center md:gap-4";

const formatIngredients = (ingredients: readonly string[]) => {
  if (ingredients.length === 0) {
    return "No ingredients";
  }

  if (ingredients.length <= 2) {
    return ingredients.join(", ");
  }

  return `${ingredients[0]}, ${ingredients[1]} +${ingredients.length - 2}`;
};

const formatCompletedTime = (isoDate: string) =>
  new Date(isoDate).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

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
    <Skeleton className="h-4 w-36" />
    <Skeleton className="h-4 w-52" tone="soft" />
    <Skeleton className="h-4 w-18" />
    <Skeleton className="h-4 w-20" />
    <Skeleton className="h-4 w-16" tone="soft" />
  </li>
);

export default function CompletedPage() {
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
      .channel("completed-realtime")
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
    <main className="h-screen overflow-hidden bg-white px-6 py-8 text-zinc-900 lg:px-10">
      <div className="mx-auto flex w-full max-w-384 flex-col gap-8">
        <Navbar />
        <section className={pageTitleSectionWithDottedRuleClassName}>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Completed</h1>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Total: {isLoading ? "..." : completedOrders.length}
          </p>
        </section>
        <section className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm md:px-6 md:py-4">
          <div className={COMPLETED_TABLE_HEADER_GRID_CLASS}>
            {isLoading ? (
              <>
                <Skeleton className="h-3 w-14" tone="soft" />
                <Skeleton className="h-3 w-12" tone="soft" />
                <Skeleton className="h-3 w-24" tone="soft" />
                <Skeleton className="h-3 w-14" tone="soft" />
                <Skeleton className="h-3 w-16" tone="soft" />
                <Skeleton className="h-3 w-10" tone="soft" />
              </>
            ) : (
              <>
                <p>TRAY #</p>
                <p>Item</p>
                <p>Ingredients</p>
                <p>Status</p>
                <p>Completed</p>
                <p>Date</p>
              </>
            )}
          </div>

          <ul className="divide-y divide-zinc-200/80">
            {isLoading
              ? Array.from({ length: 6 }, (_, index) => <CompletedRowSkeleton key={index} />)
              : completedOrders.map((order) => (
                  <li key={order.id} className={COMPLETED_TABLE_DATA_ROW_CLASS}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 md:hidden">
                      {order.trayNumber}
                    </p>
                    <p className="font-semibold md:font-medium">{order.trayNumber}</p>
                    <p>{order.item}</p>
                    <p className="text-zinc-700">{formatIngredients(order.ingredients)}</p>
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
                    <p>{formatCompletedTime(order.completedAt)}</p>
                    <p>{formatCompletedDate(order.completedAt)}</p>
                  </li>
                ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
