import { NextResponse } from "next/server";
import { isSongId } from "@/lib/songs";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import type { DbControlState, UpdateControlStateRequestBody } from "@/types/control";

const CONTROL_STATE_ID = 1;

export async function POST() {
  try {
    const { client: supabase, error: supabaseError } = getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: supabaseError }, { status: 500 });
    }

    const { data, error } = await supabase
      .from("control_state")
      .select("music_enabled, current_song, volume")
      .eq("id", CONTROL_STATE_ID)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Control state not found." }, { status: 404 });
    }

    const row = data as DbControlState;

    return NextResponse.json({
      success: true,
      state: {
        musicEnabled: row.music_enabled,
        currentSong: row.current_song,
        volume: row.volume,
      },
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

export async function PATCH(req: Request) {
  try {
    const { client: supabase, error: supabaseError } = getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: supabaseError }, { status: 500 });
    }

    const body = (await req.json()) as UpdateControlStateRequestBody;
    const patch: Partial<DbControlState> & { updated_at: string } = {
      updated_at: new Date().toISOString(),
    };

    if (body.musicEnabled !== undefined) {
      if (typeof body.musicEnabled !== "boolean") {
        return NextResponse.json({ error: "Invalid musicEnabled." }, { status: 400 });
      }

      patch.music_enabled = body.musicEnabled;
    }

    if (body.currentSong !== undefined) {
      if (body.currentSong !== null && !isSongId(body.currentSong)) {
        return NextResponse.json({ error: "Invalid currentSong." }, { status: 400 });
      }

      patch.current_song = body.currentSong;
    }

    if (body.volume !== undefined) {
      const volume = Math.round(Number(body.volume));
      if (!Number.isFinite(volume) || volume < 0 || volume > 100) {
        return NextResponse.json({ error: "Invalid volume." }, { status: 400 });
      }

      patch.volume = volume;
    }

    if (Object.keys(patch).length === 1) {
      return NextResponse.json({ error: "No control state fields to update." }, { status: 400 });
    }

    const { error } = await supabase
      .from("control_state")
      .update(patch)
      .eq("id", CONTROL_STATE_ID);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown server error",
      },
      { status: 500 },
    );
  }
}
