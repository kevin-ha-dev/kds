export const songs = [
  { id: "SONG:1", name: "Banjo" },
  { id: "SONG:2", name: "Cake On the Counter" },
] as const;

export type Song = (typeof songs)[number];

export type SongId = Song["id"];

export function isSongId(value: string): value is SongId {
  return songs.some((song) => song.id === value);
}
