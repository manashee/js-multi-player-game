import type { Observable } from "../shared/observable";
import type { Action, NetEvent } from "./Events";

export interface NetClient {
  events: Observable<NetEvent>;
  connect(opts: { endpoint: string; name?: string }): Promise<void>;
  send(action: Action): void;
  dispose(): void;
}

