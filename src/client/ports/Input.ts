import type { Observable } from "../shared/observable";
import type { InputEvent } from "./Events";

export interface InputPort {
  events: Observable<InputEvent>;
  attach(): void;
  detach(): void;
}

