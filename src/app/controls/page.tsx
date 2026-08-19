"use client";

import { useEffect, useState } from "react";
import { LiveCameraFeed, Navbar } from "@/components";

const dances = [
  { id: "dance-1", name: "Dance 1", description: "Routine one" },
  { id: "dance-2", name: "Dance 2", description: "Routine two" },
  { id: "dance-3", name: "Dance 3", description: "Routine three" },
  { id: "dance-4", name: "Dance 4", description: "Routine four" },
  { id: "dance-5", name: "Dance 5", description: "Routine five" },
  { id: "dance-6", name: "Dance 6", description: "Routine six" },
] as const;

const songs = [
  { id: "song-1", name: "Song 1" },
  { id: "song-2", name: "Song 2" },
  { id: "song-3", name: "Song 3" },
  { id: "song-4", name: "Song 4" },
] as const;

export default function ControlsPage() {
  const [isMusicOn, setIsMusicOn] = useState(false);
  const [activeDanceId, setActiveDanceId] = useState<string | null>(null);
  const [selectedSongId, setSelectedSongId] = useState<string>(songs[0].id);

  const selectedSong = songs.find((song) => song.id === selectedSongId) ?? songs[0];

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <main className="h-screen overflow-hidden bg-white px-6 pt-8 pb-0 text-zinc-900 lg:px-10">
      <div className="flex h-full w-full min-h-0 flex-col">
        <div className="mb-4">
          <Navbar />
        </div>

        <section className="mt-6 flex min-h-0 flex-1 flex-col gap-5 overflow-hidden pb-6">
          <div className="shrink-0 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-linear-to-br from-zinc-800 to-zinc-600 text-white shadow-inner">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
                </svg>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    {isMusicOn ? "Now playing" : "Paused"}
                  </p>
                  {isMusicOn ? (
                    <span className="inline-flex h-3.5 items-end gap-[2px]" aria-hidden>
                      <span className="block h-3.5 w-[3px] origin-bottom animate-eq rounded-full bg-zinc-700" />
                      <span className="block h-3.5 w-[3px] origin-bottom animate-eq rounded-full bg-zinc-700 [animation-delay:200ms]" />
                      <span className="block h-3.5 w-[3px] origin-bottom animate-eq rounded-full bg-zinc-700 [animation-delay:400ms]" />
                      <span className="block h-3.5 w-[3px] origin-bottom animate-eq rounded-full bg-zinc-700 [animation-delay:80ms]" />
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 truncate text-base font-semibold text-zinc-900">
                  {selectedSong.name}
                </p>
              </div>

              <button
                type="button"
                aria-pressed={isMusicOn}
                aria-label={isMusicOn ? "Pause music" : "Play music"}
                onClick={() => setIsMusicOn((on) => !on)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-sm transition-transform hover:scale-105 active:scale-95"
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

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-dotted border-zinc-200 pt-4">
              {songs.map((song) => {
                const isSelected = selectedSong.id === song.id;
                return (
                  <button
                    key={song.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedSongId(song.id)}
                    className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
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
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="flex min-h-0 flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="shrink-0">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Dances
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Trigger a dance routine on the robot.
                </p>
              </div>

              <div className="mt-4 grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-3">
                {dances.map((dance) => {
                  const isActive = activeDanceId === dance.id;
                  return (
                    <button
                      key={dance.id}
                      type="button"
                      aria-pressed={isActive}
                      aria-busy={isActive}
                      onClick={() =>
                        setActiveDanceId((current) =>
                          current === dance.id ? null : dance.id,
                        )
                      }
                      className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-semibold text-zinc-800 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
                    >
                      <span>{dance.name}</span>
                      {isActive ? (
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

            <LiveCameraFeed className="min-h-0" />
          </div>
        </section>
      </div>
    </main>
  );
}
