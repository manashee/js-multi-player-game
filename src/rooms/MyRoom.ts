import { Room, Client } from "@colyseus/core";
import { MyState, Player } from "./schema/MyState";

export class MyRoom extends Room<MyState> {
  maxClients = 8;
  state = new MyState();

  // Internal: secret map of cell contents (not exposed in schema)
  private secrets: Map<string, { type: 0 | 1 | 2; depth: number; consumed?: boolean }> = new Map();
  private lastMoveAt: Map<string, number> = new Map();

  onCreate(options: any) {
    const width = Number(options?.width ?? 10);
    const height = Number(options?.height ?? 10);
    this.state.width = Math.max(3, Math.min(50, width));
    this.state.height = Math.max(3, Math.min(50, height));

    this.secrets = this.generateSecrets(this.state.width, this.state.height);

    this.onMessage("move", (client, data: any) => this.handleMove(client, data));
    this.onMessage("dig", (client, data: any) => this.handleDig(client, data));
  }

  onJoin(client: Client, options: any) {
    const player = new Player();
    const name = typeof options?.name === 'string' && options.name.trim() ? options.name.trim() : this.generateName();
    player.name = name;
    player.x = Math.floor(Math.random() * this.state.width);
    player.y = Math.floor(Math.random() * this.state.height);
    player.gold = 0;
    player.poisoned = false;
    this.state.players.set(client.sessionId, player);
    this.lastMoveAt.set(client.sessionId, 0);
  }

  async onLeave(client: Client, consented?: boolean) {
    // If the disconnection was voluntary, remove immediately.
    if (consented) {
      this.state.players.delete(client.sessionId);
      return;
    }

    // Allow reconnection for transient network issues within 20 seconds.
    try {
      await this.allowReconnection(client, 20);
      // Reconnected: keep player's state
      return;
    } catch (e) {
      // Didn't reconnect in time: clean up state
      this.state.players.delete(client.sessionId);
    }
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }

  private key(x: number, y: number) { return `${x},${y}`; }

  private generateName(): string {
    const letters = ['p','q','r','s','t','u','v','w','x','y','z'];
    for (const l of letters) {
      if (![...this.state.players.values()].some(p => p.name === l)) return l;
    }
    return 'p' + Math.floor(Math.random() * 1000);
  }

  private generateSecrets(width: number, height: number) {
    const map = new Map<string, { type: 0 | 1 | 2; depth: number }>();
    const total = width * height;
    const goldCount = Math.max(1, Math.floor(total * 0.07));
    const gasCount = Math.max(1, Math.floor(total * 0.05));
    const taken = new Set<string>();
    const place = (type: 1 | 2, count: number) => {
      for (let i = 0; i < count; i++) {
        let x = 0, y = 0, k = '';
        do {
          x = Math.floor(Math.random() * width);
          y = Math.floor(Math.random() * height);
          k = this.key(x, y);
        } while (taken.has(k));
        taken.add(k);
        map.set(k, { type, depth: 1 + Math.floor(Math.random() * 9) });
      }
    };
    place(1, goldCount);
    place(2, gasCount);
    return map;
  }

  private handleMove(client: Client, data: any) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    const now = Date.now();
    const last = this.lastMoveAt.get(client.sessionId) || 0;
    if (now - last < 1000) { return; }

    let dx = 0, dy = 0;
    if (typeof data === 'string') {
      if (data === 'w') dy = -1;
      else if (data === 's') dy = 1;
      else if (data === 'a') dx = -1;
      else if (data === 'd') dx = 1;
    } else if (data && typeof data.dx === 'number' && typeof data.dy === 'number') {
      dx = Math.sign(data.dx);
      dy = Math.sign(data.dy);
    }

    const nx = Math.max(0, Math.min(this.state.width - 1, player.x + dx));
    const ny = Math.max(0, Math.min(this.state.height - 1, player.y + dy));
    if (nx !== player.x || ny !== player.y) {
      player.x = nx;
      player.y = ny;
      this.lastMoveAt.set(client.sessionId, now);
    }
  }

  private handleDig(client: Client, data: any) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    const x = player.x;
    const y = player.y;
    const k = this.key(x, y);
    const inc = Math.max(1, Math.min(10, Number((data && data.d) ?? data ?? 1)));
    const current = this.state.pits.get(k) ?? 0;
    const nextDepth = Math.min(50, current + inc);
    this.state.pits.set(k, nextDepth);

    const secret = this.secrets.get(k) as any;
    if (secret && !secret.consumed) {
      if (nextDepth >= secret.depth) {
        if (secret.type === 1) {
          secret.consumed = true;
          player.gold += 1;
          this.broadcast("found", { type: 'gold', x, y, depth: secret.depth, by: player.name, totalGold: player.gold });
        } else if (secret.type === 2) {
          secret.consumed = true;
          player.poisoned = true;
          this.broadcast("found", { type: 'gas', x, y, depth: secret.depth, by: player.name });
        }
      }
    }
  }
}
