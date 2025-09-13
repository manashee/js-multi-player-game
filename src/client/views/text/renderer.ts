import type { Renderer } from "../../ports/Renderer";
import type { RenderModel } from "../../shared/types";

export class TextRenderer implements Renderer {
  async init() {}
  dispose() {}

  render(model: RenderModel) {
    const { width, height, pits, trees, players } = model;
    const playerAt: Record<string, { name: string }[]> = {};
    for (const p of players) {
      const k = `${p.x},${p.y}`;
      (playerAt[k] ||= []).push({ name: p.name });
    }
    let lines: string[] = [];
    for (let y = 0; y < height; y++) {
      let line = '';
      for (let x = 0; x < width; x++) {
        const k = `${x},${y}`;
        if (trees.has(k)) {
          line += 'T';
        } else if (playerAt[k]?.length) {
          const initial = playerAt[k][0].name[0] || '?';
          line += initial;
        } else {
          const depth = pits.get(k) || 0;
          line += depth > 0 ? String(Math.min(depth, 9)) : '·';
        }
      }
      lines.push(line);
    }
    process.stdout.write('\x1Bc');
    console.log(`Mining Game (${width}x${height})`);
    console.log('Controls: w/a/s/d move, e dig, E dig x5, q quit');
    console.log(lines.join('\n'));
    console.log('\nPlayers:');
    for (const p of players) {
      const tribe = p.tribe ? `[${p.tribe}]` : '';
      console.log(`- ${p.name}${tribe}(${p.x},${p.y}) gold=${p.gold}${p.poisoned ? ' poisoned' : ''}`);
    }
  }
}

