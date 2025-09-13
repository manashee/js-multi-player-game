import type { InputPort } from "../../ports/Input";
import { createSubject } from "../../shared/observable";
import type { InputEvent } from "../../ports/Events";

export class TextInput implements InputPort {
  events = createSubject<InputEvent>();
  private attached = false;

  attach(): void {
    if (this.attached) return;
    this.attached = true;
    if (!process.stdin.isTTY) return;
    process.stdin.setRawMode?.(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    const onData = (key: string) => {
      if (key === '\u0003' || key === 'q') {
        this.events.next({ type: 'quit' });
        return;
      }
      if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
        this.events.next({ type: 'move', dir: key });
      } else if (key === 'e') {
        this.events.next({ type: 'dig', amount: 1 });
      } else if (key === 'E') {
        this.events.next({ type: 'dig', amount: 5 });
      }
    };
    (this as any)._onData = onData;
    process.stdin.on('data', onData);
  }

  detach(): void {
    if (!this.attached) return;
    this.attached = false;
    const onData = (this as any)._onData;
    if (onData) process.stdin.off('data', onData);
  }
}

