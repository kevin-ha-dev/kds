import { NextResponse } from "next/server";
import {
  ingredientAmountsToDisplayList,
  ingredientAmountsToLevelsJson,
} from "@/lib/ingredients";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import type { CreateOrderRequestBody, CreateOrderSuccessBody } from "@/types/order";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateOrderRequestBody;
    const { burgerType, trayNumber, ingredientAmounts, ingredients } = body;

    const normalizedBurgerType = burgerType?.trim();
    const parsedTrayNumber = Number(trayNumber);

    if (!Number.isFinite(parsedTrayNumber)) {
      return NextResponse.json({ error: "Missing or invalid trayNumber." }, { status: 400 });
    }

    if (!ingredientAmounts || typeof ingredientAmounts !== "object") {
      return NextResponse.json({ error: "Missing ingredientAmounts." }, { status: 400 });
    }

    if (!normalizedBurgerType) {
      return NextResponse.json({ error: "Missing burgerType." }, { status: 400 });
    }

    const { client: supabase, error: supabaseError } = getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: supabaseError }, { status: 500 });
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

    const { data: newOrderId, error } = await supabase.rpc("create_burger_order_with_amounts", {
      p_client_id: 1,
      p_tray_number: parsedTrayNumber,
      p_burger_name: normalizedBurgerType,
      p_ingredient_levels,
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
            p_burger_name: normalizedBurgerType,
            p_ingredient_levels,
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
        { error: "create_burger_order_with_amounts did not return an order id." },
        { status: 500 },
      );
    }

    const resolvedIngredients =
      Array.isArray(ingredients) && ingredients.length > 0
        ? ingredients
        : ingredientAmountsToDisplayList(ingredientAmounts);

    const successBody: CreateOrderSuccessBody = {
      success: true,
      orderId: String(numericOrderId),
      burgerType: normalizedBurgerType,
      trayNumber: parsedTrayNumber,
      ingredients: resolvedIngredients,
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
