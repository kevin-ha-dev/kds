import { NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import type { DeleteOrderRequestBody } from "@/types/order";

export async function DELETE(req: Request) {
  try {
    const { client: supabase, error: supabaseError } = getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: supabaseError }, { status: 500 });
    }

    const body = (await req.json()) as DeleteOrderRequestBody;
    const normalizedOrderId = body.orderId?.trim();
    const parsedOrderId = Number.parseInt(normalizedOrderId ?? "", 10);

    if (!normalizedOrderId || !Number.isFinite(parsedOrderId)) {
      return NextResponse.json({ error: "Missing or invalid orderId." }, { status: 400 });
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

    const { error: deleteError } = await supabase.from("orders").delete().eq("id", existingOrder.id);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, orderId: normalizedOrderId });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown server error",
      },
      { status: 500 },
    );
  }
}
