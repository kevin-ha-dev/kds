import { NextResponse } from "next/server";
import { isDanceCommand } from "@/lib/emotes";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import type { SendDanceRequestBody } from "@/types/control";

export async function POST(req: Request) {
  try {
    const { client: supabase, error: supabaseError } = getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: supabaseError }, { status: 500 });
    }

    const body = (await req.json()) as SendDanceRequestBody;
    const command = body.command?.trim();

    if (!command || !isDanceCommand(command)) {
      return NextResponse.json({ error: "Missing or invalid dance command." }, { status: 400 });
    }

    const { error } = await supabase.from("control_commands").insert({ command });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, command });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown server error",
      },
      { status: 500 },
    );
  }
}
