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
    // Fixed first-person-like camera (no user rotation)
    const camera = new BABYLON.UniversalCamera('cam', new BABYLON.Vector3(0, 12, -12), this.scene);
    camera.setTarget(new BABYLON.Vector3(0, 0, 0));
    camera.inputs.clear(); // disable user input (no rotation)
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
      const sphere = BABYLON.MeshBuilder.CreateSphere('pl-'+p.name, { diameter: 0.8 }, this.scene);
      const wx = ox + p.x*cell;
      const wy = oy + p.y*cell;
      sphere.position = new BABYLON.Vector3(wx, 0.4, wy);
      const mat = new BABYLON.StandardMaterial('mpl-'+p.name, this.scene);
      const color = p.tribe === 'a' ? new BABYLON.Color3(1,0.32,0.32) : (p.tribe === 'b' ? new BABYLON.Color3(0.25,0.77,1) : new BABYLON.Color3(1,0.84,0.25));
      mat.diffuseColor = color;
      sphere.material = mat;

      // Label plane above the sphere
      const plane = BABYLON.MeshBuilder.CreatePlane('lbl-'+p.name, { width: 1.6, height: 0.6 }, this.scene);
      plane.position = new BABYLON.Vector3(wx, 1.3, wy);
      plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
      const tex = new BABYLON.DynamicTexture('dt-'+p.name, { width: 256, height: 96 }, this.scene, false);
      tex.hasAlpha = true;
      const ctx = tex.getContext();
      ctx.clearRect(0,0,256,96);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0,0,256,96);
      ctx.font = 'bold 48px sans-serif';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.name, 128, 48);
      tex.update();
      const pmat = new BABYLON.StandardMaterial('ml-'+p.name, this.scene);
      pmat.diffuseTexture = tex;
      pmat.emissiveColor = new BABYLON.Color3(1,1,1);
      pmat.backFaceCulling = false;
      plane.material = pmat;
    }

    // Fix camera position/look without rotation (center on grid or first player)
    const cam = this.scene.activeCamera as BABYLON.UniversalCamera;
    const focus = model.players[0];
    const focusPos = focus ? new BABYLON.Vector3(ox + focus.x*cell, 0, oy + focus.y*cell) : new BABYLON.Vector3(0,0,0);
    if (cam) {
      const dist = Math.max(12, Math.max(model.width, model.height) * 0.9);
      cam.position = focusPos.add(new BABYLON.Vector3(-dist*0.6, dist*0.7, -dist*0.6));
      cam.setTarget(focusPos);
    }
  }
}
