export type PlayerVM = {
  name: string;
  tribe?: string;
  x: number;
  y: number;
  gold: number;
  poisoned?: boolean;
};

export type RenderModel = {
  width: number;
  height: number;
  pits: Map<string, number>;
  trees: Set<string>;
  players: PlayerVM[];
};

