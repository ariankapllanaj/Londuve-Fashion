import * as THREE from 'three';
import { notesVertex, notesFragment } from './shaders.js';

/**
 * Scroll-scrubbed WebGL slideshow for the aroma notes.
 * progress t ∈ [0, n-1]; the fractional part drives the shader transition.
 */
export class NotesGallery {
  constructor(canvas, images) {
    this.canvas = canvas;
    this.images = images;
    this.t = 0;
    this.tS = 0;
    this.visible = false;
    this.mouse = new THREE.Vector2(0.5, 0.5);
    this.mouseS = new THREE.Vector2(0.5, 0.5);
    this.hover = 0;
    this.hoverS = 0;
    this.velocity = 0;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x050404, 1);

    this.textures = images.map((img) => {
      const tex = new THREE.Texture(img);
      tex.needsUpdate = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.generateMipmaps = true;
      tex.userData.res = new THREE.Vector2(img.naturalWidth || img.width, img.naturalHeight || img.height);
      return tex;
    });

    this.uniforms = {
      uFrom: { value: this.textures[0] },
      uTo: { value: this.textures[1] },
      uFromRes: { value: this.textures[0].userData.res },
      uToRes: { value: this.textures[1].userData.res },
      uRes: { value: new THREE.Vector2(1, 1) },
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uVelocity: { value: 0 },
      uMouse: { value: this.mouseS },
      uHover: { value: 0 },
    };
    this.scene = new THREE.Scene();
    this.camera = new THREE.Camera();
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      vertexShader: notesVertex, fragmentShader: notesFragment, uniforms: this.uniforms, depthTest: false,
    }));
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
    this.last = performance.now();

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize();

    this.io = new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; }, { rootMargin: '10% 0px' });
    this.io.observe(canvas);

    canvas.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.set((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height);
      this.hover = 1;
    });
    canvas.addEventListener('pointerleave', () => { this.hover = 0; });

    // upload textures before the section is reached (avoids a hitch)
    this.textures.forEach((t) => this.renderer.initTexture(t));
  }

  resize() {
    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.uniforms.uRes.value.set(w, h);
  }

  setProgress(t) { this.t = t; }
  setVelocity(v) { this.velocity = v; }

  render() {
    const now = performance.now();
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    if (!this.visible) return;
    this.uniforms.uTime.value += dt;
    this.tS += (this.t - this.tS) * (1 - Math.exp(-10 * dt));
    const n = this.textures.length;
    const t = THREE.MathUtils.clamp(this.tS, 0, n - 1);
    const from = Math.min(Math.floor(t), n - 2);
    const to = from + 1;
    const local = t - from;
    this.uniforms.uFrom.value = this.textures[from];
    this.uniforms.uTo.value = this.textures[to];
    this.uniforms.uFromRes.value = this.textures[from].userData.res;
    this.uniforms.uToRes.value = this.textures[to].userData.res;
    this.uniforms.uProgress.value = local;
    this.mouseS.lerp(this.mouse, 1 - Math.exp(-6 * dt));
    this.hoverS += (this.hover - this.hoverS) * (1 - Math.exp(-4 * dt));
    this.uniforms.uHover.value = this.hoverS;
    this.uniforms.uVelocity.value += (Math.max(-2, Math.min(2, this.velocity)) - this.uniforms.uVelocity.value) * 0.1;
    this.renderer.render(this.scene, this.camera);
  }
}
