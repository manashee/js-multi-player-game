import type { Renderer } from "../ports/Renderer";
import type { InputPort } from "../ports/Input";
import type { NetClient } from "../ports/NetClient";
import type { Action } from "../ports/Events";
import type { RenderModel } from "../shared/types";

export async function runApp(
  renderer: Renderer,
  input: InputPort,
  net: NetClient,
  opts: { endpoint: string; name?: string }
) {
  await renderer.init();

  // input -> actions -> net
  input.attach();
  const unsubInput = input.events.subscribe((ev) => {
    if (ev.type === 'quit') {
      net.dispose();
      input.detach();
      renderer.dispose();
      if (typeof process !== 'undefined') process.exit?.(0);
      return;
    }
    const action: Action = ev.type === 'move' ? { type: 'move', dir: ev.dir } : { type: 'dig', amount: ev.amount };
    net.send(action);
  });

  // net -> model -> renderer
  const unsubNet = net.events.subscribe((evt) => {
    if (evt.type === 'state') {
      renderer.render(evt.payload as RenderModel);
    }
  });

  await net.connect(opts);

  return () => {
    unsubInput();
    unsubNet();
    input.detach();
    net.dispose();
    renderer.dispose();
  };
}

