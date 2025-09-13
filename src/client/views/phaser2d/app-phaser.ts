import { ColyseusNetClient } from "../../core/colyseus-adapter";
import { runApp } from "../../core/app";
import { PhaserRenderer } from "./renderer";
import { PhaserInput } from "./input";

const ENDPOINT = (import.meta as any).env?.VITE_COLYSEUS_ENDPOINT || 'http://localhost:2567';
const PLAYER_NAME = '';

export async function bootPhaser() {
  const renderer = new PhaserRenderer();
  const input = new PhaserInput();
  const net = new ColyseusNetClient();
  await runApp(renderer, input, net, { endpoint: ENDPOINT, name: PLAYER_NAME });
}

bootPhaser();

