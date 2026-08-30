"use client";

import { useEffect, useRef, useState } from "react";
import { Volume1, Volume2, VolumeX } from "lucide-react";
import { LiveCameraFeed, Navbar, Skeleton } from "@/components";
import { emotes, type Emote } from "@/lib/emotes";
import { parseResponseJson } from "@/lib/parse-response-json";
import { isSongId, songs } from "@/lib/songs";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import type {
  ControlState,
  ControlStateResponse,
  DbControlState,
  SendDanceResponse,
  UpdateControlStateRequestBody,
} from "@/types/control";

const VOLUME_WRITE_DELAY_MS = 300;

async function patchControlState(patch: UpdateControlStateRequestBody) {
  try {
    const response = await fetch("/api/controls/state", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patch),
    });

    const data = await parseResponseJson<ControlStateResponse>(response);
    if (!response.ok || !data?.success) {
      throw new Error(data?.error ?? "Failed to update control state.");
    }
  } catch (error) {
    console.error("Update control state failed", error);
  }
}

type VolumeSliderProps = {
  volume: number;
  onVolumeChange: (volume: number) => void;
};

const VolumeSlider = ({ volume, onVolumeChange }: VolumeSliderProps) => {
  const trackRef = useRef<HTMLDivElement>(null);

  const setVolumeFromClientX = (clientX: number) => {
    const track = trackRef.current;
    if (!track) {
      return;
    }

    const { left, width } = track.getBoundingClientRect();
    const nextVolume = Math.round(Math.min(1, Math.max(0, (clientX - left) / width)) * 100);
    onVolumeChange(nextVolume);
  };

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-label="Volume"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={volume}
      aria-valuetext={`${volume} percent`}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        setVolumeFromClientX(event.clientX);
      }}
      onPointerMove={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
          return;
        }

        setVolumeFromClientX(event.clientX);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowUp") {
          event.preventDefault();
          onVolumeChange(Math.min(100, volume + 5));
          return;
        }

        if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
          event.preventDefault();
          onVolumeChange(Math.max(0, volume - 5));
        }
      }}
      className="group flex h-6 min-w-0 flex-1 cursor-pointer items-center outline-none"
    >
      <div className="relative h-1.5 w-full rounded-full bg-zinc-200">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-accent"
          style={{ width: `${volume}%` }}
        />
        <div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-zinc-200 bg-white shadow-sm transition-transform group-active:scale-95 group-focus-visible:ring-2 group-focus-visible:ring-accent/40"
          style={{ left: `${volume}%` }}
        />
      </div>
    </div>
  );
};

export default function ControlsPage() {
  const [isMusicOn, setIsMusicOn] = useState(false);
  const [isControlStateLoaded, setIsControlStateLoaded] = useState(false);
  const [pendingEmoteId, setPendingEmoteId] = useState<string | null>(null);
  const [selectedSongId, setSelectedSongId] = useState<string>(songs[0].id);
  const [volume, setVolume] = useState(70);
  const [volumeBeforeMute, setVolumeBeforeMute] = useState(70);
  const volumeWriteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedSong = songs.find((song) => song.id === selectedSongId) ?? songs[0];
  const isMuted = volume === 0;
  const VolumeIcon = isMuted ? VolumeX : volume < 40 ? Volume1 : Volume2;

  const applyVolume = (nextVolume: number) => {
    setVolume(nextVolume);
    if (nextVolume > 0) {
      setVolumeBeforeMute(nextVolume);
    }

    if (volumeWriteTimeoutRef.current) {
      clearTimeout(volumeWriteTimeoutRef.current);
    }

    volumeWriteTimeoutRef.current = setTimeout(() => {
      volumeWriteTimeoutRef.current = null;
      void patchControlState({ volume: nextVolume });
    }, VOLUME_WRITE_DELAY_MS);
  };

  const toggleMusic = () => {
    const nextMusicEnabled = !isMusicOn;
    setIsMusicOn(nextMusicEnabled);
    void patchControlState({ musicEnabled: nextMusicEnabled });
  };

  const selectSong = (songId: string) => {
    setSelectedSongId(songId);
    void patchControlState({ currentSong: songId });
  };

  const handleEmoteClick = async (emote: Emote) => {
    if (pendingEmoteId) {
      return;
    }

    setPendingEmoteId(emote.id);

    try {
      const response = await fetch("/api/controls/dance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ command: emote.command }),
      });

      const data = await parseResponseJson<SendDanceResponse>(response);
      if (!response.ok || !data?.success) {
        throw new Error(data?.error ?? "Failed to send dance command.");
      }
    } catch (error) {
      console.error("Send dance command failed", error);
    } finally {
      setPendingEmoteId(null);
    }
  };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;

      if (volumeWriteTimeoutRef.current) {
        clearTimeout(volumeWriteTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const applyState = (state: ControlState) => {
      setIsMusicOn(state.musicEnabled);

      if (state.currentSong && isSongId(state.currentSong)) {
        setSelectedSongId(state.currentSong);
      }

      // A pending local write means the user is still dragging; keep the slider where they put it.
      if (volumeWriteTimeoutRef.current === null) {
        setVolume(state.volume);
        if (state.volume > 0) {
          setVolumeBeforeMute(state.volume);
        }
      }
    };

    const loadControlState = async () => {
      try {
        const response = await fetch("/api/controls/state", {
          method: "POST",
        });

        const data = await parseResponseJson<ControlStateResponse>(response);
        if (!response.ok || !data?.success || !data.state) {
          throw new Error(data?.error ?? "Failed to load control state.");
        }

        applyState(data.state);
      } catch (error) {
        console.error("Load control state failed", error);
      } finally {
        setIsControlStateLoaded(true);
      }
    };

    void loadControlState();

    const { client, error } = getBrowserSupabaseClient();
    if (!client) {
      console.error("Control state realtime unavailable", error);
      return;
    }

    const channel = client
      .channel("control-state-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "control_state" },
        (payload) => {
          const row = payload.new as DbControlState;
          applyState({
            musicEnabled: row.music_enabled,
            currentSong: row.current_song,
            volume: row.volume,
          });
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, []);

  return (
    <main className="h-screen overflow-hidden bg-white px-6 pt-8 pb-0 text-zinc-900 lg:px-10">
      <div className="flex h-full w-full min-h-0 flex-col">
        <div className="mb-4">
          <Navbar />
        </div>

        <section className="mt-6 flex min-h-0 flex-1 flex-col gap-5 overflow-hidden pb-6 lg:grid lg:grid-cols-2 lg:grid-rows-[auto_minmax(0,1fr)]">
          <div className="order-3 shrink-0 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm lg:order-1 lg:col-span-2">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-linear-to-br from-zinc-800 to-zinc-600 text-white shadow-inner">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
                </svg>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {isControlStateLoaded ? (
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                      {isMusicOn ? "Now playing" : "Paused"}
                    </p>
                  ) : (
                    <Skeleton className="h-3 w-20" tone="soft" />
                  )}
                  {isControlStateLoaded && isMusicOn ? (
                    <span className="inline-flex h-3.5 items-end gap-[2px]" aria-hidden>
                      <span className="block h-3.5 w-[3px] origin-bottom animate-eq rounded-full bg-zinc-700" />
                      <span className="block h-3.5 w-[3px] origin-bottom animate-eq rounded-full bg-zinc-700 [animation-delay:200ms]" />
                      <span className="block h-3.5 w-[3px] origin-bottom animate-eq rounded-full bg-zinc-700 [animation-delay:400ms]" />
                      <span className="block h-3.5 w-[3px] origin-bottom animate-eq rounded-full bg-zinc-700 [animation-delay:80ms]" />
                    </span>
                  ) : null}
                </div>
                {isControlStateLoaded ? (
                  <p className="mt-0.5 truncate text-base font-semibold text-zinc-900">
                    {selectedSong.name}
                  </p>
                ) : (
                  <Skeleton className="mt-1 h-5 w-36" tone="strong" />
                )}
              </div>

              <button
                type="button"
                aria-pressed={isMusicOn}
                aria-label={isMusicOn ? "Pause music" : "Play music"}
                disabled={!isControlStateLoaded}
                onClick={toggleMusic}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                {isMusicOn ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M7 5h3.2v14H7zM13.8 5H17v14h-3.2z" />
                  </svg>
                ) : (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden
                    className="translate-x-px"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {songs.map((song) => {
                const isSelected = isControlStateLoaded && selectedSong.id === song.id;
                return (
                  <button
                    key={song.id}
                    type="button"
                    aria-pressed={isSelected}
                    disabled={!isControlStateLoaded}
                    onClick={() => selectSong(song.id)}
                    className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                      isSelected
                        ? "border-zinc-400 bg-zinc-100 text-zinc-900"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                    }`}
                  >
                    {song.name}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-3 border-t border-dotted border-zinc-200 pt-4">
              <button
                type="button"
                aria-label={isMuted ? "Unmute" : "Mute"}
                aria-pressed={isMuted}
                disabled={!isControlStateLoaded}
                onClick={() => {
                  if (isMuted) {
                    applyVolume(volumeBeforeMute || 70);
                    return;
                  }

                  setVolumeBeforeMute(volume);
                  applyVolume(0);
                }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50"
              >
                <VolumeIcon className="h-4 w-4" strokeWidth={2} aria-hidden />
              </button>

              {isControlStateLoaded ? (
                <>
                  <VolumeSlider volume={volume} onVolumeChange={applyVolume} />

                  <span className="w-8 shrink-0 text-right text-[11px] font-semibold tabular-nums tracking-tight text-zinc-500">
                    {volume}
                  </span>
                </>
              ) : (
                <>
                  <Skeleton className="h-1.5 min-w-0 flex-1 rounded-full" />
                  <Skeleton className="h-3 w-8 shrink-0" tone="soft" />
                </>
              )}
            </div>
          </div>

          <div className="order-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white p-5 shadow-sm lg:order-2 lg:flex-none">
            <div className="shrink-0">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Emotes
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                Trigger an emote on the robot.
              </p>
            </div>

            <div className="mt-4 grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-3">
              {emotes.map((emote) => {
                const isPending = pendingEmoteId === emote.id;
                return (
                  <button
                    key={emote.id}
                    type="button"
                    aria-busy={isPending}
                    disabled={pendingEmoteId !== null}
                    onClick={() => void handleEmoteClick(emote)}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-semibold text-zinc-800 transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    <span>{emote.name}</span>
                    {isPending ? (
                      <span
                        aria-hidden
                        className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-800"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <LiveCameraFeed className="order-1 min-h-0 flex-1 lg:order-3 lg:flex-none" />
        </section>
      </div>
    </main>
  );
}
