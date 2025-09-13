import type { MyState, Player as SPlayer } from "../../rooms/schema/MyState";
import type { RenderModel, PlayerVM } from "../shared/types";

export function toRenderModel(state: MyState): RenderModel {
  const width = (state as any)?.width ?? 10;
  const height = (state as any)?.height ?? 10;

  const pits = new Map<string, number>();
  const pitsSrc: any = (state as any)?.pits;
  if (pitsSrc && typeof pitsSrc.forEach === 'function') {
    pitsSrc.forEach((v: number, k: string) => pits.set(k, v));
  }

  const trees = new Set<string>();
  const treesSrc: any = (state as any)?.trees;
  if (treesSrc && typeof treesSrc.forEach === 'function') {
    treesSrc.forEach((_v: number, k: string) => trees.add(k));
  }

  const players: PlayerVM[] = [];
  const playersSrc: any = (state as any)?.players;
  if (playersSrc && typeof playersSrc.forEach === 'function') {
    playersSrc.forEach((p: SPlayer) => {
      players.push({
        name: (p as any)?.name ?? '?',
        tribe: (p as any)?.tribe,
        x: (p as any)?.x ?? 0,
        y: (p as any)?.y ?? 0,
        gold: (p as any)?.gold ?? 0,
        poisoned: (p as any)?.poisoned ?? false,
      });
    });
  }

  return { width, height, pits, trees, players };
}
