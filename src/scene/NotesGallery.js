import * as THREE from 'three';
import { notesVertex, notesFragment } from './shaders.js';

/**
 * All four aroma notes in one view.
 * One transparent WebGL canvas covers the notes grid and draws every photo into
 * its own arch (scissored viewports, one draw call each). Each photo is revealed
 * by the molten-gold front as the grid scrolls in; hovering an arch adds a ripple
 * and a slight zoom while the other notes dim.
 */
export class NotesGallery {
  constructor(canvas, images, targets) {
    this.canvas = canvas;
    this.visible = false;
    this.velocity = 0;
    this.time = 0;
    this.focus = -1;
    this.cssH = 1;
    this.pr = Math.min(window.devicePixelRatio || 1, 2);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.pr);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.autoClear = false;

    this.cards = images.map((img, i) => {
      const tex = new THREE.Texture(img);
      tex.needsUpdate = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.generateMipmaps = true;
      return {
        el: targets[i],
        tex,
        res: new THREE.Vector2(img.naturalWidth || img.width, img.naturalHeight || img.height),
        rect: { x: 0, y: 0, w: 0, h: 0 },
        reveal: 0, revealS: 0,
        mouse: new THREE.Vector2(0.5, 0.5), mouseS: new THREE.Vector2(0.5, 0.5),
        hover: 0, hoverS: 0, dimS: 0,
        seed: i * 3.17,
      };
    });

    this.uniforms = {
      uTex: { value: this.cards[0].tex },
      uTexRes: { value: new THREE.Vector2(1, 1) },
      uRes: { value: new THREE.Vector2(1, 1) },
      uRadius: { value: 0 },
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uVelocity: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uHover: { value: 0 },
      uDim: { value: 0 },
      uSeed: { value: 0 },
    };
    this.scene = new THREE.Scene();
    this.camera = new THREE.Camera();
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      vertexShader: notesVertex, fragmentShader: notesFragment, uniforms: this.uniforms,
      depthTest: false, depthWrite: false, blending: THREE.NoBlending,
    }));
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
    this.last = performance.now();

    this.ro = new ResizeObserver(() => this.measure());
    this.ro.observe(canvas);
    targets.forEach((el) => this.ro.observe(el));
    this.measure();

    this.io = new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; }, { rootMargin: '10% 0px' });
    this.io.observe(canvas);

    // upload textures before the section is reached (avoids a hitch)
    this.cards.forEach((c) => this.renderer.initTexture(c.tex));
  }

  /** positions of the arches relative to the canvas (they scroll together, so this only changes on layout) */
  measure() {
    const c = this.canvas.getBoundingClientRect();
    this.cssH = c.height || 1;
    this.renderer.setSize(c.width || 1, c.height || 1, false);
    this.cards.forEach((card) => {
      const r = card.el.getBoundingClientRect();
      card.rect = { x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.height };
    });
  }

  setReveal(i, p) { if (this.cards[i]) this.cards[i].reveal = p; }
  setPointer(i, x, y) { this.cards[i]?.mouse.set(x, y); }
  setFocus(i) {
    this.focus = i;
    this.cards.forEach((c, k) => { c.hover = k === i ? 1 : 0; });
  }
  setVelocity(v) { this.velocity = v; }

  render() {
    const now = performance.now();
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    if (!this.visible) return;
    this.time += dt;
    const u = this.uniforms;
    const r = this.renderer;
    u.uTime.value = this.time;
    u.uVelocity.value += (Math.max(-2, Math.min(2, this.velocity)) - u.uVelocity.value) * 0.1;

    r.setScissorTest(false);
    r.clear();
    r.setScissorTest(true);
    const kReveal = 1 - Math.exp(-9 * dt);
    const kHover = 1 - Math.exp(-5 * dt);
    this.cards.forEach((c, i) => {
      c.revealS += (c.reveal - c.revealS) * kReveal;
      c.mouseS.lerp(c.mouse, 1 - Math.exp(-6 * dt));
      c.hoverS += (c.hover - c.hoverS) * kHover;
      c.dimS += ((this.focus >= 0 && this.focus !== i ? 1 : 0) - c.dimS) * kHover;
      const { x, y, w, h } = c.rect;
      if (w < 2 || h < 2 || c.revealS < 0.002) return;
      const vy = this.cssH - y - h; // WebGL viewports start at the bottom
      r.setViewport(x, vy, w, h);
      r.setScissor(x, vy, w, h);
      u.uTex.value = c.tex;
      u.uTexRes.value = c.res;
      u.uRes.value.set(w * this.pr, h * this.pr);
      // same corner maths as CSS `border-radius: 999px 999px 18px 18px` (radii are scaled down together)
      u.uRadius.value = 18 * Math.min(1, w / 1998, h / 1017) * this.pr;
      u.uProgress.value = Math.min(1, c.revealS);
      u.uMouse.value = c.mouseS;
      u.uHover.value = c.hoverS;
      u.uDim.value = c.dimS;
      u.uSeed.value = c.seed;
      r.render(this.scene, this.camera);
    });
  }
}
