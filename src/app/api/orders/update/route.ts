import { NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import type { UpdateOrderTrayRequestBody } from "@/types/order";

export async function PATCH(req: Request) {
  try {
    const { client: supabase, error: supabaseError } = getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: supabaseError }, { status: 500 });
    }

    const body = (await req.json()) as UpdateOrderTrayRequestBody;
    const normalizedOrderId = body.orderId?.trim();
    const parsedOrderId = Number.parseInt(normalizedOrderId ?? "", 10);
    const parsedTray = Number(body.trayNumber);

    if (!normalizedOrderId || !Number.isFinite(parsedOrderId)) {
      return NextResponse.json({ error: "Missing or invalid orderId." }, { status: 400 });
    }

    if (!Number.isFinite(parsedTray)) {
      return NextResponse.json({ error: "Missing or invalid trayNumber." }, { status: 400 });
    }

    const { data: existingOrder, error: findError } = await supabase
      .from("orders")
      .select("id")
      .eq("id", parsedOrderId)
      .maybeSingle();

    if (findError) {
      return NextResponse.json({ error: findError.message }, { status: 500 });
    }

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update({ tray_number: parsedTray })
      .eq("id", parsedOrderId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      orderId: normalizedOrderId,
      trayNumber: parsedTray,
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
