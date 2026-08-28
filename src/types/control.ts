export type SendDanceRequestBody = {
  command?: string;
};

export type SendDanceResponse = {
  success?: boolean;
  error?: string;
  command?: string;
};

export type ControlState = {
  musicEnabled: boolean;
  currentSong: string | null;
  volume: number;
};

export type ControlStateResponse = {
  success?: boolean;
  error?: string;
  state?: ControlState;
};

export type UpdateControlStateRequestBody = {
  musicEnabled?: boolean;
  currentSong?: string | null;
  volume?: number;
};

export type DbControlState = {
  music_enabled: boolean;
  current_song: string | null;
  volume: number;
};
