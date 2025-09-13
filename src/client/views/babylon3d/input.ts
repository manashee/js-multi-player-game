import type { InputPort } from "../../ports/Input";
import { createSubject } from "../../shared/observable";
import type { InputEvent } from "../../ports/Events";

export class BabylonInput implements InputPort {
  events = createSubject<InputEvent>();
  private handler?: (e: KeyboardEvent) => void;

  attach(): void {
    this.handler = (e: KeyboardEvent) => {
      const key = e.key;
      if (key === 'q') this.events.next({ type: 'quit' });
      else if (key === 'w' || key === 'a' || key === 's' || key === 'd') this.events.next({ type: 'move', dir: key });
      else if (key === 'e') this.events.next({ type: 'dig', amount: 1 });
      else if (key === 'E') this.events.next({ type: 'dig', amount: 5 });
    };
    window.addEventListener('keydown', this.handler);
  }

  detach(): void {
    if (this.handler) window.removeEventListener('keydown', this.handler);
  }
}

