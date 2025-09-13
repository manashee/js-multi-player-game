import { Room, Client } from "@colyseus/core";
import { MyState, Player } from "./schema/MyState";

export class MyRoom extends Room<MyState> {
  maxClients = 16;
  state = new MyState();

  // Internal: secret map of cell contents (not exposed in schema)
  private secrets: Map<string, { type: 0 | 1 | 2; depth: number; consumed?: boolean }> = new Map();
  private lastMoveAt: Map<string, number> = new Map();
  private joinedAt: Map<string, number> = new Map();
  private tribes = ['a','b','c'];
  private tribeIndex = 0;

  onCreate(options: any) {
    const width = Number(options?.width ?? 10);
    const height = Number(options?.height ?? 10);
    this.state.width = Math.max(3, Math.min(50, width));
    this.state.height = Math.max(3, Math.min(50, height));

    this.secrets = this.generateSecrets(this.state.width, this.state.height);
    this.generateTrees(this.state.width, this.state.height);

    this.onMessage("move", (client, data: any) => this.handleMove(client, data));
    this.onMessage("dig", (client, data: any) => this.handleDig(client, data));
  }

  onJoin(client: Client, options: any) {
    const player = new Player();
    const tribe = this.tribes[this.tribeIndex++ % this.tribes.length];
    player.tribe = tribe;
    const providedName = (typeof options?.name === 'string' ? options.name.trim() : '') || '';
    player.name = providedName || this.generateName();
    // spawn at random non-tree position
    let x = 0, y = 0;
    do {
      x = Math.floor(Math.random() * this.state.width);
      y = Math.floor(Math.random() * this.state.height);
    } while (this.hasTree(x, y));
    player.x = x;
    player.y = y;
    player.gold = 0;
    player.poisoned = false;
    this.state.players.set(client.sessionId, player);
    const now = Date.now();
    this.lastMoveAt.set(client.sessionId, 0);
    this.joinedAt.set(client.sessionId, now);
    // Immediately resolve any combat if spawn is in LoS of opponents
    this.resolveCombatAround(client.sessionId, null);
  }

  async onLeave(client: Client, consented?: boolean) {
    // If the disconnection was voluntary, remove immediately.
    if (consented) {
      if (this.state.players.has(client.sessionId)) {
        this.state.players.delete(client.sessionId);
      }
      return;
    }

    // Allow reconnection for transient network issues within 20 seconds.
    try {
      await this.allowReconnection(client, 20);
      // Reconnected: keep player's state
      return;
    } catch (e) {
      // Didn't reconnect in time: clean up state
      if (this.state.players.has(client.sessionId)) {
        this.state.players.delete(client.sessionId);
      }
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
    // removed 1-move-per-second throttle

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
      // can't move into a tree
      if (!this.hasTree(nx, ny)) {
        player.x = nx;
        player.y = ny;
        // no throttle timestamp update
        // After movement, resolve combat with defender's advantage
        this.resolveCombatAround(client.sessionId, client.sessionId);
      }
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

  // --- Trees ---
  private generateTrees(width: number, height: number) {
    // Place a few clusters so they can appear as "TT"
    const cells = width * height;
    const clusters = Math.max(1, Math.floor(cells * 0.05));
    for (let i = 0; i < clusters; i++) {
      const cx = Math.floor(Math.random() * width);
      const cy = Math.floor(Math.random() * height);
      const size = 1 + Math.floor(Math.random() * 3); // 1..3 cells cluster
      for (let j = 0; j < size; j++) {
        const ox = cx + (Math.random() < 0.5 ? 0 : (Math.random() < 0.5 ? -1 : 1));
        const oy = cy + (Math.random() < 0.5 ? 0 : (Math.random() < 0.5 ? -1 : 1));
        if (ox >= 0 && oy >= 0 && ox < width && oy < height) {
          this.state.trees.set(this.key(ox, oy), 1);
        }
      }
      // ensure center tree
      this.state.trees.set(this.key(cx, cy), 1);
    }
  }

  private hasTree(x: number, y: number) {
    return (this.state.trees.get(this.key(x, y)) ?? 0) > 0;
  }

  // --- Combat ---
  private resolveCombatAround(moverSessionId: string | null, movedBySessionId: string | null) {
    // If movedBySessionId is provided, the defender (opponent) shoots first.
    // Otherwise, break ties by earlier join time.
    const entries = Array.from(this.state.players.entries());
    const players = new Map(entries);
    if (players.size <= 1) return;

    // If movement triggered, prioritize resolving any opponent that has LoS to the mover
    if (movedBySessionId) {
      const mover = players.get(movedBySessionId);
      if (!mover) return;
      // find opponents in LoS
      const threats: { sid: string; dist: number }[] = [];
      for (const [sid, other] of players) {
        if (sid === movedBySessionId) continue;
        if (other.tribe === mover.tribe) continue;
        if (this.inLineOfSight(mover.x, mover.y, other.x, other.y)) {
          const dist = this.chebyshev(mover.x, mover.y, other.x, other.y);
          threats.push({ sid, dist });
        }
      }
      if (threats.length > 0) {
        // closest opponent shoots first
        threats.sort((a, b) => a.dist - b.dist);
        const shooterSid = threats[0].sid;
        this.killPlayer(movedBySessionId, shooterSid);
        return;
      }
    }

    // Otherwise scan pairs and resolve by joinedAt
    for (const [sidA, a] of players) {
      for (const [sidB, b] of players) {
        if (sidA >= sidB) continue;
        if (a.tribe === b.tribe) continue;
        if (this.inLineOfSight(a.x, a.y, b.x, b.y)) {
          const ja = this.joinedAt.get(sidA) || 0;
          const jb = this.joinedAt.get(sidB) || 0;
          const shooterSid = ja <= jb ? sidA : sidB;
          const targetSid = shooterSid === sidA ? sidB : sidA;
          this.killPlayer(targetSid, shooterSid);
          return;
        }
      }
    }
  }

  private chebyshev(x1: number, y1: number, x2: number, y2: number) {
    return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
  }

  private inLineOfSight(ax: number, ay: number, bx: number, by: number) {
    // within distance 3 (diagonally or otherwise)
    if (this.chebyshev(ax, ay, bx, by) > 3) return false;
    // trees block bullets: check cells along the line excluding endpoints
    const cells = this.bresenham(ax, ay, bx, by);
    for (let i = 1; i < cells.length - 1; i++) {
      const [x, y] = cells[i];
      if (this.hasTree(x, y)) return false;
    }
    return true;
  }

  private bresenham(x0: number, y0: number, x1: number, y1: number): [number, number][] {
    const points: [number, number][] = [];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0, y = y0;
    while (true) {
      points.push([x, y]);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }
    return points;
  }

  private killPlayer(targetSid: string, shooterSid: string) {
    const victim = this.state.players.get(targetSid);
    if (!victim) return;
    // transfer gold to nearest other player (any tribe)
    const receiverSid = this.findNearestAlive(targetSid);
    if (receiverSid) {
      const receiver = this.state.players.get(receiverSid);
      if (receiver) receiver.gold += victim.gold;
    }
    // remove victim from the board
    this.state.players.delete(targetSid);
    this.lastMoveAt.delete(targetSid);
    this.joinedAt.delete(targetSid);
  }

  private findNearestAlive(fromSid: string): string | null {
    const from = this.state.players.get(fromSid);
    if (!from) return null;
    let best: { sid: string; d: number } | null = null;
    for (const [sid, p] of this.state.players) {
      if (sid === fromSid) continue;
      const d = Math.abs(p.x - from.x) + Math.abs(p.y - from.y);
      if (!best || d < best.d) best = { sid, d };
    }
    return best?.sid ?? null;
  }
}
