import { NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import type { CreateOrderRequestBody, CreateOrderSuccessBody } from "@/types/order";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateOrderRequestBody;
    const { burgerType, trayNumber, ingredients } = body;

    const normalizedBurgerType = burgerType?.trim();
    const parsedTrayNumber = Number(trayNumber);

    if (!Number.isFinite(parsedTrayNumber)) {
      return NextResponse.json({ error: "Missing or invalid trayNumber." }, { status: 400 });
    }

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json({ error: "Missing ingredients." }, { status: 400 });
    }

    if (!normalizedBurgerType) {
      return NextResponse.json({ error: "Missing burgerType." }, { status: 400 });
    }

    const { client: supabase, error: supabaseError } = getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: supabaseError }, { status: 500 });
    }

    const { data: newOrderId, error } = await supabase.rpc("create_burger_order", {
      p_client_id: 1,
      p_tray_number: parsedTrayNumber,
      p_selected_ingredients: ingredients,
      p_burger_name: normalizedBurgerType,
    });

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          sentParams: {
            p_client_id: 1,
            p_tray_number: parsedTrayNumber,
            p_selected_ingredients: ingredients,
            p_burger_name: normalizedBurgerType,
          },
        },
        { status: 500 },
      );
    }

    const numericOrderId =
      typeof newOrderId === "number"
        ? newOrderId
        : typeof newOrderId === "string"
          ? Number.parseInt(newOrderId, 10)
          : Number.NaN;

    if (!Number.isFinite(numericOrderId)) {
      return NextResponse.json(
        { error: "create_burger_order did not return an order id." },
        { status: 500 },
      );
    }

    const { error: friesError } = await supabase.from("order_command").insert({
      order_id: numericOrderId,
      command_code: "3_1",
      command_level: 1,
      is_disabled: false,
      status: "pending",
    });

    if (friesError) {
      return NextResponse.json(
        { error: friesError.message, orderId: String(numericOrderId) },
        { status: 500 },
      );
    }

    const successBody: CreateOrderSuccessBody = {
      success: true,
      orderId: String(numericOrderId),
      burgerType: normalizedBurgerType,
      trayNumber: parsedTrayNumber,
      ingredients,
    };

    return NextResponse.json(successBody);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown server error",
      },
      { status: 500 },
    );
  }
}
