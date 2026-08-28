export const emotes = [
  { id: "emote-dab", name: "Dab", command: "dance_1" },
  { id: "emote-wave", name: "Wave", command: "dance_2" },
  { id: "emote-crab", name: "Crab", command: "dance_3" },
  { id: "emote-heart", name: "Heart", command: "dance_4" },
] as const;

export type Emote = (typeof emotes)[number];

export type DanceCommand = Emote["command"];

export function isDanceCommand(value: string): value is DanceCommand {
  return emotes.some((emote) => emote.command === value);
}
