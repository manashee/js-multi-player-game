import { ColyseusNetClient } from "../../core/colyseus-adapter";
import { runApp } from "../../core/app";
import { BabylonRenderer } from "./renderer";
import { BabylonInput } from "./input";

const ENDPOINT = (import.meta as any).env?.VITE_COLYSEUS_ENDPOINT || 'http://localhost:2567';
const PLAYER_NAME = '';

export async function bootBabylon() {
  const renderer = new BabylonRenderer();
  const input = new BabylonInput();
  const net = new ColyseusNetClient();
  await runApp(renderer, input, net, { endpoint: ENDPOINT, name: PLAYER_NAME });
}

bootBabylon();

