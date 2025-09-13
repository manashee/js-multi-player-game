import type { RenderModel } from "../shared/types";

export interface Renderer {
  init(): void | Promise<void>;
  render(model: RenderModel): void;
  dispose(): void;
}

