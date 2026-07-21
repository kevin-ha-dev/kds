import { NextResponse } from "next/server";
import { ingredientAmountsToLevelsJson } from "@/lib/ingredients";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import type { UpdateOrderRequestBody } from "@/types/order";

export async function PATCH(req: Request) {
  try {
    const { client: supabase, error: supabaseError } = getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: supabaseError }, { status: 500 });
    }

    const body = (await req.json()) as UpdateOrderRequestBody;
    const normalizedOrderId = body.orderId?.trim();
    const parsedOrderId = Number.parseInt(normalizedOrderId ?? "", 10);
    const parsedTray = Number(body.trayNumber);
    const normalizedBurgerType = body.burgerType?.trim();
    const { ingredientAmounts } = body;

    if (!normalizedOrderId || !Number.isFinite(parsedOrderId)) {
      return NextResponse.json({ error: "Missing or invalid orderId." }, { status: 400 });
    }

    if (!Number.isFinite(parsedTray)) {
      return NextResponse.json({ error: "Missing or invalid trayNumber." }, { status: 400 });
    }

    if (!ingredientAmounts || typeof ingredientAmounts !== "object") {
      return NextResponse.json({ error: "Missing ingredientAmounts." }, { status: 400 });
    }

    const { data: existingOrder, error: findError } = await supabase
      .from("orders")
      .select("id, status")
      .eq("id", parsedOrderId)
      .maybeSingle();

    if (findError) {
      return NextResponse.json({ error: findError.message }, { status: 500 });
    }

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    if (existingOrder.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending orders can update ingredient amounts." },
        { status: 400 },
      );
    }

    const { data: commandRows, error: commandRowsError } = await supabase
      .from("commands")
      .select("ingredient_name, command_code")
      .eq("is_active", true);

    if (commandRowsError) {
      return NextResponse.json({ error: commandRowsError.message }, { status: 500 });
    }

    const p_ingredient_levels = ingredientAmountsToLevelsJson(
      commandRows ?? [],
      ingredientAmounts,
    );

    const orderPatch: { tray_number: number; burger_name?: string } = {
      tray_number: parsedTray,
    };
    if (normalizedBurgerType) {
      orderPatch.burger_name = normalizedBurgerType;
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update(orderPatch)
      .eq("id", parsedOrderId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const { error: amountsError } = await supabase.rpc("set_order_ingredient_amounts", {
      p_order_id: parsedOrderId,
      p_ingredient_levels,
    });

    if (amountsError) {
      return NextResponse.json(
        {
          error: amountsError.message,
          code: amountsError.code,
          details: amountsError.details,
          hint: amountsError.hint,
          sentParams: {
            p_order_id: parsedOrderId,
            p_ingredient_levels,
          },
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      orderId: normalizedOrderId,
      trayNumber: parsedTray,
      burgerType: normalizedBurgerType,
      ingredientLevels: p_ingredient_levels,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown server error",
      },
      { status: 500 },
    );
  }
}
