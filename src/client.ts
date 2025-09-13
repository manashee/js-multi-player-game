import { Client, Room, getStateCallbacks } from 'colyseus.js';
import { MyState } from './rooms/schema/MyState';

const ENDPOINT = process.env.COLYSEUS_ENDPOINT || 'http://localhost:2567';

type MyRoomType = Room<MyState>;

let client: Client;
let room: MyRoomType | undefined;
let tickInterval: NodeJS.Timeout | undefined;

function clearTicker() {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = undefined;
  }
}

function wireRoomListeners(r: MyRoomType) {
  const $ = getStateCallbacks(r);

  // Watch players join/leave and field changes
  $(r.state).players.onAdd((player, sessionId) => {
    console.log('Player joined:', sessionId);
    $(player).listen('x', (newX) => console.log(`x changed for ${sessionId}:`, newX));
    $(player).listen('y', (newY) => console.log(`y changed for ${sessionId}:`, newY));
  });

  $(r.state).players.onRemove((_player, sessionId) => {
    console.log('Player left:', sessionId);
  });

  // Ignore dev playground messages
  r.onMessage("__playground_message_types", () => { /* ignore */ });

  // Handle disconnects/errors: trigger reconnect flow
  r.onLeave((code) => {
    console.warn('Room left/closed. Code:', code);
    clearTicker();
    // start reconnect attempts
    reconnectLoop().catch((err) => console.error('Reconnect loop aborted:', err));
  });

  r.onError((code, message) => {
    console.error('Room error:', code, message);
  });
}

async function joinRoom(): Promise<MyRoomType> {
  if (!client) client = new Client(ENDPOINT);
  console.log('Joining room at', ENDPOINT);
  const r = await client.joinOrCreate<MyState>('my_room', {
    // custom join options
  });
  console.log('Joined room:', r.roomId, 'session:', r.sessionId);
  return r;
}

async function startTicking(r: MyRoomType) {
  clearTicker();
  tickInterval = setInterval(() => {
    try {
      r.send('incrementX');
    } catch (e) {
      console.warn('Failed to send tick message:', e);
    }
  }, 5000);
}

async function connectAndSubscribe() {
  room = await joinRoom();
  wireRoomListeners(room);
  await startTicking(room);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function reconnectLoop() {
  // Try to reconnect by re-joining the room (server restarts destroy old rooms)
  let attempt = 0;
  const maxDelay = 15_000;
  while (true) {
    attempt++;
    try {
      await connectAndSubscribe();
      console.log('Reconnected after', attempt, 'attempt(s).');
      return;
    } catch (err) {
      const delay = Math.min(1000 * Math.pow(2, Math.min(attempt, 4)), maxDelay);
      console.warn(`Reconnect attempt ${attempt} failed:`, err);
      console.log(`Retrying in ${Math.round(delay / 1000)}s...`);
      await sleep(delay);
    }
  }
}

async function main() {
  try {
    await connectAndSubscribe();
  } catch (err) {
    console.error('Initial connect failed:', err);
    await reconnectLoop();
  }
}

// optional: argument not used right now, preserved for compatibility
// let i = Number(process.argv[2]) || 1;

main().catch((e) => {
  console.error('Fatal error in client:', e);
  process.exit(1);
});
