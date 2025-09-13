import { ColyseusNetClient } from "../../core/colyseus-adapter";
import { runApp } from "../../core/app";
import { TextRenderer } from "./renderer";
import { TextInput } from "./input";

const ENDPOINT = process.env.COLYSEUS_ENDPOINT || 'http://localhost:2567';
const PLAYER_NAME = process.env.PLAYER_NAME || process.argv[2] || '';

async function main() {
  const renderer = new TextRenderer();
  const input = new TextInput();
  const net = new ColyseusNetClient();
  await runApp(renderer, input, net, { endpoint: ENDPOINT, name: PLAYER_NAME });
  // keep process alive even if stdin is not TTY
  await new Promise(() => {});
}

main().catch(() => process.exit(1));
