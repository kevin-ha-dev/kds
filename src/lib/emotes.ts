export const emotes = [
  { id: "emote-dab", name: "Dab", command: "DANCE:1" },
  { id: "emote-crab", name: "Crab", command: "DANCE:2" },
  { id: "emote-wave", name: "Wave", command: "DANCE:3" },
  { id: "emote-heart", name: "Heart", command: "DANCE:4" },
] as const;

export type Emote = (typeof emotes)[number];

export type DanceCommand = Emote["command"];

export function isDanceCommand(value: string): value is DanceCommand {
  return emotes.some((emote) => emote.command === value);
}
