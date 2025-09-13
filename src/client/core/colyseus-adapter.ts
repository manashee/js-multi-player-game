import { Client, Room, getStateCallbacks } from 'colyseus.js';
import type { MyState } from '../../rooms/schema/MyState';
import type { Action, NetEvent } from '../ports/Events';
import type { NetClient } from '../ports/NetClient';
import { createSubject } from '../shared/observable';
import { toRenderModel } from '../domain/selectors';

export class ColyseusNetClient implements NetClient {
  events = createSubject<NetEvent>();
  private client!: Client;
  private room!: Room<MyState>;
  private unsubscribers: Array<() => void> = [];
  private endpoint = '';
  private name = '';

  async connect(opts: { endpoint: string; name?: string }) {
    this.endpoint = opts.endpoint;
    this.name = opts.name || '';
    this.client = new Client(this.endpoint);
    this.room = await this.client.joinOrCreate<MyState>('my_room', { name: this.name });
    this.events.next({ type: 'connected' });

    const $ = getStateCallbacks(this.room);
    const emit = () => this.events.next({ type: 'state', payload: toRenderModel(this.room.state) });

    const push = (u: any) => { if (typeof u === 'function') this.unsubscribers.push(u); };
    push($(this.room.state).listen('width', emit));
    push($(this.room.state).listen('height', emit));
    $(this.room.state).pits.onAdd((_v, _k) => emit());
    $(this.room.state).pits.onChange((_v, _k) => emit());
    $(this.room.state).pits.onRemove((_v, _k) => emit());
    // trees may exist
    const treesContainer: any = (this.room.state as any);
    const trees: any = treesContainer.trees;
    if (trees && typeof trees.onAdd === 'function') {
      trees.onAdd((_v: number, _k: string) => emit());
      trees.onRemove((_v: number, _k: string) => emit());
      trees.onChange((_v: number, _k: string) => emit());
    }
    $(this.room.state).players.onAdd((player, _sid) => {
      push($(player).listen('x', emit));
      push($(player).listen('y', emit));
      push($(player).listen('gold', emit));
      const l = (player as any).listen?.('tribe', emit);
      if (typeof l === 'function') push(l);
      emit();
    });
    $(this.room.state).players.onRemove((_player, _sid) => emit());

    emit();

    this.room.onLeave((_code) => {
      this.events.next({ type: 'disconnected' });
    });
    this.room.onError((_code, _message) => { /* suppress */ });
    this.room.onMessage('__playground_message_types', () => { /* suppress */ });
  }

  send(action: Action) {
    if (!this.room) return;
    if (action.type === 'move') this.room.send('move', action.dir);
    else if (action.type === 'dig') this.room.send('dig', { d: action.amount });
  }

  dispose() {
    this.unsubscribers.forEach((u) => u());
    this.unsubscribers = [];
    try { this.room && this.room.leave(); } catch {}
  }
}
