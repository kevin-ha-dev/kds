"use client";

import { useEffect, useRef, useState } from "react";
import { Volume1, Volume2, VolumeX } from "lucide-react";
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
  const [activeDanceId, setActiveDanceId] = useState<string | null>(null);
  const [selectedSongId, setSelectedSongId] = useState<string>(songs[0].id);
  const [volume, setVolume] = useState(70);
  const [volumeBeforeMute, setVolumeBeforeMute] = useState(70);

  const selectedSong = songs.find((song) => song.id === selectedSongId) ?? songs[0];
  const isMuted = volume === 0;
  const VolumeIcon = isMuted ? VolumeX : volume < 40 ? Volume1 : Volume2;

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

            <div className="mt-4 flex flex-wrap items-center gap-2">
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

            <div className="mt-4 flex items-center gap-3 border-t border-dotted border-zinc-200 pt-4">
              <button
                type="button"
                aria-label={isMuted ? "Unmute" : "Mute"}
                aria-pressed={isMuted}
                onClick={() => {
                  if (isMuted) {
                    setVolume(volumeBeforeMute || 70);
                    return;
                  }

                  setVolumeBeforeMute(volume);
                  setVolume(0);
                }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              >
                <VolumeIcon className="h-4 w-4" strokeWidth={2} aria-hidden />
              </button>

              <VolumeSlider
                volume={volume}
                onVolumeChange={(nextVolume) => {
                  setVolume(nextVolume);
                  if (nextVolume > 0) {
                    setVolumeBeforeMute(nextVolume);
                  }
                }}
              />

              <span className="w-8 shrink-0 text-right text-[11px] font-semibold tabular-nums tracking-tight text-zinc-500">
                {volume}
              </span>
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
