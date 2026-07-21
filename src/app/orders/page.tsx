"use client";

import { useEffect, useState } from "react";
import { AddBurgerModal, ConfirmDeleteModal, Navbar, Receipt, Skeleton } from "@/components";
import { parseResponseJson } from "@/lib/parse-response-json";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import type {
  ActiveOrdersResponse,
  BurgerFormValues,
  CreateBurgerPayload,
  CreateOrderResponse,
  DeleteOrderResponse,
  Order,
} from "@/types/order";

const initialOrders: Order[] = [];

/** Active tickets stay in queue order: oldest at the front, newest at the back. */
const sortOrdersAsQueue = (orders: Order[]) =>
  [...orders].sort((a, b) => {
    const aCreated = a.createdAt ? Date.parse(a.createdAt) : Number.NaN;
    const bCreated = b.createdAt ? Date.parse(b.createdAt) : Number.NaN;

    if (Number.isFinite(aCreated) && Number.isFinite(bCreated) && aCreated !== bCreated) {
      return aCreated - bCreated;
    }

    const aId = Number.parseInt(a.id, 10);
    const bId = Number.parseInt(b.id, 10);
    if (Number.isFinite(aId) && Number.isFinite(bId)) {
      return aId - bId;
    }

    return a.id.localeCompare(b.id);
  });

const getNextTrayNumber = (orders: Order[]) => {
  const trays = orders
    .map((order) => order.trayNumber)
    .filter((n) => Number.isFinite(n));
  const maxTray = trays.length > 0 ? Math.max(...trays) : 0;
  return maxTray + 1;
};

const OrderReceiptSkeleton = () => (
  <article
    className="grid min-h-70 h-full grid-rows-[auto_auto_1fr] gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
  >
    <div className="grid grid-cols-[1fr_auto] items-start gap-3">
      <Skeleton className="h-3 w-22" tone="strong" />
      <Skeleton className="h-7 w-12 rounded-md" />
    </div>
    <div className="space-y-3">
      <Skeleton className="h-6 w-4/5" tone="strong" />
      <Skeleton className="h-3 w-2/5" tone="soft" />
    </div>
    <div className="border-t border-dotted border-zinc-300 pt-3">
      <Skeleton className="h-3 w-24" tone="soft" />
      <div className="mt-3 space-y-2">
        <Skeleton className="h-3 w-10/12" />
        <Skeleton className="h-3 w-8/12" tone="soft" />
        <Skeleton className="h-3 w-9/12" />
        <Skeleton className="h-3 w-7/12" tone="soft" />
      </div>
    </div>
  </article>
);

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [isLoading, setIsLoading] = useState(true);
  const [, setErrorBanner] = useState<string | null>(null);
  const [isAddBurgerModalOpen, setIsAddBurgerModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderIdPendingDelete, setOrderIdPendingDelete] = useState<string | null>(null);

  const selectedOrder = orders.find((order) => order.id === selectedOrderId);

  const fetchActiveOrders = async () => {
    const response = await fetch("/api/orders/active", {
      method: "POST",
    });

    const data = await parseResponseJson<ActiveOrdersResponse>(response);

    if (!data) {
      throw new Error(
        `Failed to load active orders. Non-JSON response received (status=${response.status}).`,
      );
    }

    if (!response.ok || !data.success) {
      throw new Error(data.error ?? "Failed to load active orders.");
    }

    setOrders(sortOrdersAsQueue(data.orders ?? []));
  };

  const closeModal = () => {
    setIsAddBurgerModalOpen(false);
    setSelectedOrderId(null);
  };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const loadActiveOrders = async () => {
      try {
        await fetchActiveOrders();
        setErrorBanner(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load active orders.";
        setErrorBanner(message);
        console.error("Load active orders failed", error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadActiveOrders();

    const { client, error } = getBrowserSupabaseClient();
    if (!client) {
      setErrorBanner(error);
      return;
    }

    const channel = client
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          void fetchActiveOrders().then(
            () => setErrorBanner(null),
            (fetchError) => {
              const message =
                fetchError instanceof Error
                  ? fetchError.message
                  : "Failed to refresh active orders from realtime updates.";
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

  const handleCreateBurger = async (
    payload: CreateBurgerPayload,
  ): Promise<{ orderId: string; trayNumber: number }> => {
    const response = await fetch("/api/orders/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as CreateOrderResponse;
    const resolvedOrderId =
      typeof data.orderId === "string" && data.orderId.trim()
        ? data.orderId.trim()
        : typeof data.orderId === "number" && Number.isFinite(data.orderId)
          ? String(Math.trunc(data.orderId))
          : null;

    if (!response.ok || !data.success || resolvedOrderId === null) {
      const debugMessage = [
        data.error ?? "Failed to create burger order.",
        data.code ? `code=${data.code}` : null,
        data.details ? `details=${data.details}` : null,
        data.hint ? `hint=${data.hint}` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      throw new Error(debugMessage);
    }

    const resolvedTray =
      typeof data.trayNumber === "number" && Number.isFinite(data.trayNumber)
        ? data.trayNumber
        : payload.trayNumber;

    return { orderId: resolvedOrderId, trayNumber: resolvedTray };
  };

  const handleCreate = async (values: BurgerFormValues) => {
    const payload: CreateBurgerPayload = {
      burgerType: values.item,
      ingredients: values.ingredients,
      ingredientAmounts: values.ingredientAmounts ?? {},
      trayNumber: values.trayNumber,
    };

    const { orderId, trayNumber } = await handleCreateBurger(payload);

    setOrders((currentOrders) =>
      sortOrdersAsQueue([
        ...currentOrders,
        {
          id: orderId,
          trayNumber,
          item: payload.burgerType,
          status: "pending",
          ingredients: payload.ingredients,
          ingredientAmounts: payload.ingredientAmounts,
          createdAt: new Date().toISOString(),
        },
      ]),
    );
  };

  const handleUpdate = async (values: BurgerFormValues) => {
    if (!selectedOrderId) {
      return;
    }

    const response = await fetch("/api/orders/update", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId: selectedOrderId,
        trayNumber: values.trayNumber,
        burgerType: values.item,
        ingredientAmounts: values.ingredientAmounts ?? {},
      }),
    });

    const data = (await response.json()) as { success?: boolean; error?: string };
    if (!response.ok || !data.success) {
      throw new Error(data.error ?? "Failed to update order.");
    }

    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === selectedOrderId
          ? {
              ...order,
              trayNumber: values.trayNumber,
              item: values.item,
              ingredients: values.ingredients,
              ingredientAmounts: values.ingredientAmounts,
            }
          : order,
      ),
    );
  };

  const handleDelete = async () => {
    if (!orderIdPendingDelete) {
      return;
    }

    const orderId = orderIdPendingDelete;
    const response = await fetch("/api/orders/delete", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orderId }),
    });

    const data = (await response.json()) as DeleteOrderResponse;
    if (!response.ok || !data.success) {
      throw new Error(data.error ?? "Failed to delete order.");
    }

    setOrders((currentOrders) => currentOrders.filter((order) => order.id !== orderId));
  };

  return (
    <main className="h-screen overflow-hidden bg-white px-6 pt-8 pb-0 text-zinc-900 lg:px-10">
      <div className="mx-auto flex h-full w-full min-h-0 max-w-384 flex-col">
        <div className="mb-4">
          <Navbar
            onBuildBurgerClick={() => {
              setModalMode("create");
              setSelectedOrderId(null);
              setIsAddBurgerModalOpen(true);
            }}
          />
        </div>
        <section className="mt-4 grid grid-cols-1 gap-3 border-b border-zinc-200 pb-4 md:grid-cols-[1fr_auto] md:items-end">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Orders</h1>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Active Tickets: {isLoading ? "..." : orders.length}
          </p>
        </section>
        <section
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ msOverflowStyle: "none" }}
        >
          <div className="grid grid-cols-1 gap-5 pt-8 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {isLoading
              ? Array.from({ length: 6 }, (_, index) => <OrderReceiptSkeleton key={index} />)
              : orders.map((order) => (
                  <Receipt
                    key={order.id}
                    orderId={order.id}
                    trayNumber={order.trayNumber}
                    item={order.item}
                    ingredients={order.ingredients}
                    onEdit={(orderId) => {
                      setModalMode("edit");
                      setSelectedOrderId(orderId);
                      setIsAddBurgerModalOpen(true);
                    }}
                    onDelete={(orderId) => setOrderIdPendingDelete(orderId)}
                  />
                ))}
          </div>
        </section>
      </div>

      <AddBurgerModal
        isOpen={isAddBurgerModalOpen}
        mode={modalMode}
        suggestedTrayNumber={getNextTrayNumber(orders)}
        initialValues={
          modalMode === "edit" && selectedOrder
            ? {
                id: selectedOrder.id,
                trayNumber: selectedOrder.trayNumber,
                item: selectedOrder.item,
                ingredients: selectedOrder.ingredients,
                ingredientAmounts: selectedOrder.ingredientAmounts,
              }
            : undefined
        }
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onClose={closeModal}
      />

      <ConfirmDeleteModal
        isOpen={orderIdPendingDelete != null}
        onClose={() => setOrderIdPendingDelete(null)}
        onConfirm={handleDelete}
      />
    </main>
  );
}
