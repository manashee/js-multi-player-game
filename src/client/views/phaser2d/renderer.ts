import type { Renderer } from "../../ports/Renderer";
import type { RenderModel } from "../../shared/types";
import Phaser from 'phaser';

export class PhaserRenderer implements Renderer {
  private game?: Phaser.Game;
  private scene?: Phaser.Scene;

  async init() {
    const self = this;
    await new Promise<void>((resolve) => {
      self.game = new Phaser.Game({
        type: Phaser.AUTO,
        width: 800,
        height: 800,
        parent: 'app',
        backgroundColor: '#101010',
        scene: {
          create: function (this: Phaser.Scene) {
            self.scene = this;
            resolve();
          },
        },
      });
    });
  }

  dispose() {
    this.game?.destroy(true);
  }

  render(model: RenderModel) {
    if (!this.scene) return;
    const s = this.scene;
    s.cameras.main.setBackgroundColor('#101010');
    s.children.removeAll();

    const cell = Math.floor(Math.min(700 / model.width, 700 / model.height));
    const ox = 50, oy = 50;

    // grid background
    const g = s.add.graphics();
    g.lineStyle(1, 0x202020, 1);
    for (let y = 0; y <= model.height; y++) {
      g.lineBetween(ox, oy + y * cell, ox + model.width * cell, oy + y * cell);
    }
    for (let x = 0; x <= model.width; x++) {
      g.lineBetween(ox + x * cell, oy, ox + x * cell, oy + model.height * cell);
    }

    // draw pits (darker tiles)
    model.pits.forEach((depth, key) => {
      const [x, y] = key.split(',').map(Number);
      if (depth > 0) {
        const gray = 0x2a2a2a;
        const r = s.add.rectangle(ox + x * cell, oy + y * cell, cell, cell, gray).setOrigin(0);
        r.setStrokeStyle(1, 0x000000);
      }
    });

    // draw trees
    for (const key of model.trees) {
      const [x, y] = key.split(',').map(Number);
      const r = s.add.rectangle(ox + x * cell, oy + y * cell, cell, cell, 0x2e7d32).setOrigin(0);
      r.setStrokeStyle(1, 0x1b5e20);
    }

    // draw players
    for (const p of model.players) {
      const color = p.tribe === 'a' ? 0xff5252 : p.tribe === 'b' ? 0x40c4ff : 0xffd740;
      s.add.rectangle(ox + p.x * cell + cell / 2, oy + p.y * cell + cell / 2, cell * 0.6, cell * 0.6, color).setOrigin(0.5);
      s.add.text(ox + p.x * cell + cell * 0.3, oy + p.y * cell + cell * 0.1, p.name[0] || '?', { fontSize: `${Math.max(12, cell / 2)}px`, color: '#000000' });
    }
  }
}
