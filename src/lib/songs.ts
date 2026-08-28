export const songs = [
  { id: "song_1", name: "Banjo" },
  { id: "song_2", name: "Happy Birthday" },
] as const;

export type Song = (typeof songs)[number];

export type SongId = Song["id"];

export function isSongId(value: string): value is SongId {
  return songs.some((song) => song.id === value);
}
