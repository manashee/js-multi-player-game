import { Room, Client } from "@colyseus/core";
import { MyState,Player } from "./schema/MyState";

export class MyRoom extends Room<MyState> {
  maxClients = 4;
  state = new MyState();
onCreate(options: any) {


    this.onMessage("incrementX", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.x += 1;
      }
    });
  }

  onJoin(client: Client) {
    const player = new Player();
    this.state.players.set(client.sessionId, player);
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

}
