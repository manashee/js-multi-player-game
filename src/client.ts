import { Client, Room, getStateCallbacks } from 'colyseus.js';
import { MyState, Player } from './rooms/schema/MyState';

const ENDPOINT = process.env.COLYSEUS_ENDPOINT || 'http://localhost:2567';
const PLAYER_NAME = process.env.PLAYER_NAME || process.argv[2] || '';

type MyRoomType = Room<MyState>;

let client: Client;
let room: MyRoomType | undefined;

// UI state
let lastRender = 0;
function throttleRender() {
  const now = Date.now();
  if (now - lastRender > 100) {
    lastRender = now;
    render();
  }
}

function wireRoomListeners(r: MyRoomType) {
  const $ = getStateCallbacks(r);

  $(r.state).listen('width', throttleRender);
  $(r.state).listen('height', throttleRender);

  $(r.state).pits.onAdd((_value, _key) => throttleRender());
  $(r.state).pits.onChange((_value, _key) => throttleRender());
  $(r.state).pits.onRemove((_value, _key) => throttleRender());

  $(r.state).players.onAdd((player, _sessionId) => {
    $(player).listen('x', throttleRender);
    $(player).listen('y', throttleRender);
    $(player).listen('gold', throttleRender);
    $(player).listen('poisoned', throttleRender);
    throttleRender();
  });

  $(r.state).players.onRemove((_player, _sessionId) => {
    throttleRender();
  });

  // Event messages
  r.onMessage('found', (_data) => { /* suppress logging to keep matrix clean */ });
  r.onMessage('__playground_message_types', () => { /* noop */ });

  // Handle disconnects/errors: trigger reconnect flow
  r.onLeave((_code) => {
    reconnectLoop().catch(() => { /* ignore */ });
  });

  r.onError((_code, _message) => { /* suppress */ });
}

async function joinRoom(): Promise<MyRoomType> {
  if (!client) client = new Client(ENDPOINT);
  const r = await client.joinOrCreate<MyState>('my_room', {
    name: PLAYER_NAME,
  });
  return r;
}

async function connectAndSubscribe() {
  room = await joinRoom();
  wireRoomListeners(room);
  setupInput();
  render();
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function reconnectLoop() {
  let attempt = 0;
  const maxDelay = 15_000;
  while (true) {
    attempt++;
    try {
      await connectAndSubscribe();
      return;
    } catch (err) {
      const delay = Math.min(1000 * Math.pow(2, Math.min(attempt, 4)), maxDelay);
      // suppress logs; just wait and retry
      await sleep(delay);
    }
  }
}

function setupInput() {
  if (!process.stdin.isTTY) return;
  process.stdin.setRawMode?.(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.removeAllListeners('data');
  process.stdin.on('data', (key: string) => {
    if (key === '\u0003' || key === 'q') { // Ctrl+C or q
      console.log('Quit.');
      process.exit(0);
    }
    if (!room) return;
    if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
      room.send('move', key);
    } else if (key === 'e') {
      room.send('dig', 1);
    } else if (key === 'E') {
      room.send('dig', { d: 5 });
    } else if (key === '?') {
      printHelp();
    }
  });
}

function printHelp() {
  console.log('Controls: w/a/s/d move, e dig 1, E dig 5, q quit');
}

function render() {
  if (!room) return;
  const s = room.state as MyState | undefined;
  const width = (s && (s as any).width) ? (s as any).width as number : 10;
  const height = (s && (s as any).height) ? (s as any).height as number : 10;

  // Clear screen
  process.stdout.write('\x1Bc');
  console.log(`Mining Game (${width}x${height}) — endpoint ${ENDPOINT}`);
  console.log('Controls: w/a/s/d move, e dig, E dig x5, q quit');

  // Build occupancy map of players by cell
  const players: Array<Player> = [];
  if (s && (s as any).players) {
    for (const p of (s as any).players.values()) players.push(p as Player);
  }

  const playerAt: Record<string, Player[]> = {};
  for (const p of players) {
    const k = `${p.x},${p.y}`;
    (playerAt[k] ||= []).push(p);
  }

  // Render grid
  let lines: string[] = [];
  for (let y = 0; y < height; y++) {
    let line = '';
    for (let x = 0; x < width; x++) {
      const k = `${x},${y}`;
      const here = playerAt[k];
      // Trees take precedence in rendering; players can't move into trees
      const hasTree = !!(s && (s as any).trees && (s as any).trees.get(k));
      if (hasTree) {
        line += 'T';
      } else if (here && here.length > 0) {
        // Show first player's tribe letter (lowercase)
        const initial = (here[0].name || '?')[0] || '?';
        line += initial; // keep lower-case for tribe a/b/c
      } else {
        const depth = (s && (s as any).pits && (s as any).pits.get(k)) || 0;
        if (depth > 0) line += String(Math.min(depth, 9));
        else line += '·'; // empty/undug
      }
    }
    lines.push(line);
  }
  console.log(lines.join('\n'));

  // Player list and inventories
  console.log('\nPlayers:');
  for (const p of players) {
    const tribe = (p as any).tribe ? `[${(p as any).tribe}]` : '';
    console.log(`- ${p.name}${tribe}(${p.x},${p.y}) gold=${p.gold}${p.poisoned ? ' poisoned' : ''}`);
  }
}

async function main() {
  try {
    await connectAndSubscribe();
  } catch (_err) {
    await reconnectLoop();
  }
}

main().catch(() => process.exit(1));
