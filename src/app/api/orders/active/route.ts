import { NextResponse } from "next/server";
import {
  commandLevelToIngredientAmount,
  ingredientAmountsToDisplayList,
  isSauceCommandCode,
} from "@/lib/ingredients";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import type { DbCommand, DbOrderCommand } from "@/types/command";
import type { DbOrder, IngredientAmount } from "@/types/order";

export async function POST() {
  try {
    const { client: supabase, error: supabaseError } = getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: supabaseError }, { status: 500 });
    }

    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, status, burger_name, tray_number")
      .in("status", ["pending", "running"])
      .order("created_at", { ascending: true });

    if (ordersError) {
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    const typedOrders = (orders ?? []) as DbOrder[];
    if (typedOrders.length === 0) {
      return NextResponse.json({ success: true, orders: [] });
    }

    const internalOrderIds = typedOrders.map((order) => order.id);
    const { data: orderCommands, error: orderCommandsError } = await supabase
      .from("order_command")
      .select("id, order_id, command_code, command_level, is_disabled")
      .in("order_id", internalOrderIds)
      .order("id", { ascending: true });

    if (orderCommandsError) {
      return NextResponse.json({ error: orderCommandsError.message }, { status: 500 });
    }

    const typedCommands = (orderCommands ?? []) as DbOrderCommand[];
    const commandCodes = [...new Set(typedCommands.map((command) => command.command_code))];

    const { data: commandRows, error: commandRowsError } = await supabase
      .from("commands")
      .select("ingredient_name, command_code")
      .in("command_code", commandCodes);

    if (commandRowsError) {
      return NextResponse.json({ error: commandRowsError.message }, { status: 500 });
    }

    const typedCommandsCatalog = (commandRows ?? []) as DbCommand[];
    const ingredientByCommandCode = new Map(
      typedCommandsCatalog.map((item) => [item.command_code, item.ingredient_name]),
    );

    const commandsByOrderId = new Map<number, DbOrderCommand[]>();
    for (const command of typedCommands) {
      const current = commandsByOrderId.get(command.order_id) ?? [];
      current.push(command);
      commandsByOrderId.set(command.order_id, current);
    }

    const formattedOrders = typedOrders.map((order) => {
      const commands = commandsByOrderId.get(order.id) ?? [];
      const ingredientAmounts: Record<string, IngredientAmount> = {};

      for (const command of commands) {
        if (command.is_disabled) {
          continue;
        }

        const ingredientName = ingredientByCommandCode.get(command.command_code);
        if (!ingredientName) {
          continue;
        }

        ingredientAmounts[ingredientName] = commandLevelToIngredientAmount(command.command_level, {
          isSauce: isSauceCommandCode(command.command_code),
        });
      }

      return {
        id: String(order.id),
        trayNumber:
          order.tray_number != null && Number.isFinite(Number(order.tray_number))
            ? Number(order.tray_number)
            : 0,
        item: order.burger_name?.trim() || "Custom Burger",
        status: order.status,
        ingredients: ingredientAmountsToDisplayList(ingredientAmounts),
        ingredientAmounts,
      };
    });

    return NextResponse.json({ success: true, orders: formattedOrders });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown server error",
      },
      { status: 500 },
    );
  }
}
