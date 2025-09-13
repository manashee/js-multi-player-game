import type { Renderer } from "../../ports/Renderer";
import type { RenderModel } from "../../shared/types";
import * as BABYLON from 'babylonjs';

export class BabylonRenderer implements Renderer {
  private canvas?: HTMLCanvasElement;
  private engine?: BABYLON.Engine;
  private scene?: BABYLON.Scene;

  async init() {
    let canvas = document.getElementById('app') as HTMLCanvasElement | null;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'app';
      document.body.style.margin = '0';
      document.body.style.overflow = 'hidden';
      document.body.appendChild(canvas);
    }
    this.canvas = canvas;
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.engine = new BABYLON.Engine(this.canvas, true);
    this.scene = new BABYLON.Scene(this.engine);
    const camera = new BABYLON.ArcRotateCamera('cam', -Math.PI/2, Math.PI/2.2, 15, new BABYLON.Vector3(0,0,0), this.scene);
    camera.attachControl(this.canvas, true);
    new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0,1,0), this.scene);
    this.engine.runRenderLoop(() => { this.scene && this.scene.render(); });
  }

  private resizeCanvas() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.canvas.style.width = '100vw';
    this.canvas.style.height = '100vh';
    if (this.engine) this.engine.resize();
  }

  dispose() { if (this.engine) this.engine.dispose(); }

  render(model: RenderModel) {
    if (!this.scene) return;
    // remove all existing meshes
    const toDispose = this.scene.meshes.slice();
    for (const m of toDispose) { m.dispose(); }
    new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0,1,0), this.scene);

    const cell = 1;
    const ox = -model.width/2;
    const oy = -model.height/2;

    for (const key of model.trees) {
      const parts = key.split(',');
      const x = parseInt(parts[0], 10);
      const y = parseInt(parts[1], 10);
      const box = BABYLON.MeshBuilder.CreateBox('t-'+key, { size: 1 }, this.scene);
      box.position = new BABYLON.Vector3(ox + x*cell, 0.5, oy + y*cell);
      const mat = new BABYLON.StandardMaterial('mt-'+key, this.scene);
      mat.diffuseColor = new BABYLON.Color3(0.16, 0.49, 0.19);
      box.material = mat;
    }

    model.pits.forEach((depth, key) => {
      if (depth <= 0) return;
      const parts = key.split(',');
      const x = parseInt(parts[0], 10);
      const y = parseInt(parts[1], 10);
      const box = BABYLON.MeshBuilder.CreateBox('p-'+key, { size: 1 }, this.scene);
      box.position = new BABYLON.Vector3(ox + x*cell, -0.5, oy + y*cell);
      const mat = new BABYLON.StandardMaterial('mp-'+key, this.scene);
      mat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
      box.material = mat;
      box.scaling.y = 0.2;
    });

    for (const p of model.players) {
      const sphere = BABYLON.MeshBuilder.CreateSphere('pl-'+p.name, { diameter: 0.7 }, this.scene);
      sphere.position = new BABYLON.Vector3(ox + p.x*cell, 0.35, oy + p.y*cell);
      const mat = new BABYLON.StandardMaterial('mpl-'+p.name, this.scene);
      const color = p.tribe === 'a' ? new BABYLON.Color3(1,0.32,0.32) : (p.tribe === 'b' ? new BABYLON.Color3(0.25,0.77,1) : new BABYLON.Color3(1,0.84,0.25));
      mat.diffuseColor = color;
      sphere.material = mat;
    }

    // Adjust camera radius to fit grid nicely
    const cam = this.scene.activeCamera as BABYLON.ArcRotateCamera;
    if (cam) {
      const size = Math.max(model.width, model.height);
      cam.radius = Math.max(8, size * 1.2);
      cam.target = new BABYLON.Vector3(0, 0, 0);
    }
  }
}
