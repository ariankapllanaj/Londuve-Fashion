import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  liquidVertex, liquidFragment, tubeVertex, tubeFragment,
  ringVertex, haloFragment, hudRingVertex, hudRingFragment,
  sparkVertex, sparkFragment, finalShader, cardFragment,
} from './shaders.js';

const damp = (a, b, lambda, dt) => THREE.MathUtils.lerp(a, b, 1 - Math.exp(-lambda * dt));

// Bottle measurements from the Blender model (units = body radius)
const BOTTLE_H = 3.8;
const LIQ_MIN = 0.586;
const LIQ_MAX = 2.068;

export const POSE_KEYS = ['x', 'y', 'z', 'rotY', 'tilt', 'scale', 'reveal', 'fill', 'ring', 'hud', 'glow'];

export class Experience {
  constructor(canvas, { mobile = false } = {}) {
    this.canvas = canvas;
    this.mobile = mobile;
    this.last = performance.now();
    this.time = 0;
    this.velocity = 0;
    this.scrollNorm = 0;
    this.pointer = new THREE.Vector2();
    this.pointerS = new THREE.Vector2();
    this.ready = false;

    // pose the scroll system drives
    this.target = { x: 0, y: -6, z: 0, rotY: -0.8, tilt: 0, scale: 0.78, reveal: 0, fill: 0, ring: 0, hud: 0, glow: 0 };
    this.pose = { ...this.target };

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false });
    this.renderer.setClearColor(0x050404, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75);
    this.renderer.setPixelRatio(this.dpr);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    this.camera.position.set(0, 0, 11);

    this.#buildEnvironment();
    this.#buildLights();
    this.#buildSparkles();
    this.#buildRings();
    this.#buildComposer();
    this.resize();
  }

  // ───────────────────────────────────────── environment (studio strips)
  #buildEnvironment() {
    const env = new THREE.Scene();
    env.background = new THREE.Color(0x000000);
    const geo = new THREE.PlaneGeometry(1, 1);
    const add = (w, h, color, intensity, pos) => {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
      m.scale.set(w, h, 1);
      m.position.set(...pos);
      m.lookAt(0, 0, 0);
      env.add(m);
    };
    add(0.55, 14, 0xfff0d8, 7, [-5.5, 0, 2.5]);  // left strip
    add(0.35, 14, 0xffe6c4, 5, [5.5, 0, 2.0]);   // right strip
    add(0.18, 14, 0xffffff, 3, [2.5, 0, 6]);     // thin front-right kicker
    add(7, 2.2, 0xffe0b0, 2.2, [0, 7, 1]);       // top softbox
    add(12, 7, 0xb8661f, 0.9, [0, -1, -8]);      // warm back wall
    add(10, 3, 0x3a2412, 1.0, [0, -6, 0]);       // floor bounce
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envMap = pmrem.fromScene(env, 0.015).texture;
    this.scene.environment = this.envMap;
    this.scene.environmentIntensity = 0;
    pmrem.dispose();
  }

  #buildLights() {
    this.key = new THREE.DirectionalLight(0xffe2bc, 0);
    this.key.position.set(5, 4, 6);
    this.sweep = new THREE.DirectionalLight(0xffffff, 0);
    this.sweep.position.set(-4, 2, 6);
    this.rim = new THREE.DirectionalLight(0xffb36b, 0);
    this.rim.position.set(-3, 3, -6);
    this.scene.add(this.key, this.sweep, this.rim);
  }

  // ───────────────────────────────────────── gold dust + four-point stars
  #buildSparkles() {
    const count = this.mobile ? 650 : 1500;
    const pos = new Float32Array(count * 3);
    const scale = new Float32Array(count);
    const seed = new Float32Array(count);
    const type = new Float32Array(count);
    this.sparkHeight = 18;
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 28;
      pos[i * 3 + 1] = (Math.random() - 0.5) * this.sparkHeight;
      pos[i * 3 + 2] = -12 + Math.random() * 16;
      scale[i] = 0.4 + Math.random() * 1.2;
      seed[i] = Math.random();
      type[i] = Math.random() < 0.07 ? 1 : 0;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aScale', new THREE.BufferAttribute(scale, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    g.setAttribute('aType', new THREE.BufferAttribute(type, 1));
    this.sparkMat = new THREE.ShaderMaterial({
      vertexShader: sparkVertex,
      fragmentShader: sparkFragment,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: this.dpr },
        uSize: { value: this.mobile ? 7 : 8 },
        uScroll: { value: 0 },
        uHeight: { value: this.sparkHeight },
        uColor: { value: new THREE.Color(1.0, 0.78, 0.5).multiplyScalar(1.6) },
        uOpacity: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.sparkles = new THREE.Points(g, this.sparkMat);
    this.sparkles.frustumCulled = false;
    this.sparkles.renderOrder = 5;
    this.scene.add(this.sparkles);
  }

  // ───────────────────────────────────────── halo (the monogram "O") + HUD rings
  #buildRings() {
    this.ringGroup = new THREE.Group();
    this.scene.add(this.ringGroup);
    const gold = new THREE.Color(0.95, 0.68, 0.34);

    this.haloMat = new THREE.ShaderMaterial({
      vertexShader: ringVertex,
      fragmentShader: haloFragment,
      uniforms: { uProgress: { value: 0 }, uOpacity: { value: 0 }, uColor: { value: gold }, uTime: { value: 0 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.halo = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.007, 8, 360), this.haloMat);
    this.halo.position.z = -1.6;
    this.ringGroup.add(this.halo);

    const hud = (inner, outer, segments, duty, opacity, z) => {
      const mat = new THREE.ShaderMaterial({
        vertexShader: hudRingVertex,
        fragmentShader: hudRingFragment,
        uniforms: {
          uOpacity: { value: 0 }, uSegments: { value: segments }, uDuty: { value: duty },
          uProgress: { value: 0 }, uColor: { value: gold.clone() },
        },
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      });
      mat.userData.base = opacity;
      const mesh = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 512, 1), mat);
      mesh.position.z = z;
      this.ringGroup.add(mesh);
      return mesh;
    };
    this.ticks = hud(2.62, 2.7, 180, 0.12, 0.55, -1.6);
    this.dashes = hud(2.86, 2.868, 48, 0.55, 0.45, -1.6);
    this.inner = hud(2.08, 2.084, 3, 0.28, 0.6, -1.6);
  }

  #buildComposer() {
    const size = new THREE.Vector2();
    this.renderer.getSize(size);
    const rt = new THREE.WebGLRenderTarget(size.x || 1, size.y || 1, { type: THREE.HalfFloatType, samples: this.mobile ? 0 : 4 });
    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.65, 0.82);
    this.composer.addPass(this.bloom);
    this.finalPass = new ShaderPass(finalShader);
    this.composer.addPass(this.finalPass);
    this.composer.addPass(new OutputPass());
  }

  // ───────────────────────────────────────── bottle
  async load(url, onProgress) {
    const loader = new GLTFLoader();
    const gltf = await new Promise((resolve, reject) => {
      loader.load(url, resolve, (e) => e.total && onProgress?.(e.loaded / e.total), reject);
    });
    const root = gltf.scene;
    const get = (name) => root.getObjectByName(name);

    this.pivot = new THREE.Group();          // position / scale / tilt
    this.spin = new THREE.Group();           // Y rotation
    this.pivot.add(this.spin);
    this.spin.add(root);
    root.position.y = -BOTTLE_H / 2;
    this.scene.add(this.pivot);

    // GLASS — real refraction through the heavy base
    const glass = get('Glass');
    this.glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, metalness: 0, roughness: 0.035, transmission: 1, thickness: 0.18, ior: 1.5,
      clearcoat: 1, clearcoatRoughness: 0.03, specularIntensity: 1, envMapIntensity: 1.5,
      attenuationColor: new THREE.Color('#fff2e0'), attenuationDistance: 3.5,
    });
    glass.material = this.glassMat;
    glass.renderOrder = 2;

    // PERFUME — custom backlit amber shader
    const liquid = get('Liquid');
    this.liquidMat = new THREE.ShaderMaterial({
      vertexShader: liquidVertex,
      fragmentShader: liquidFragment,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 }, uFill: { value: 0 }, uReveal: { value: 0 }, uGlow: { value: 0.4 }, uWobble: { value: 0 },
        uMinY: { value: LIQ_MIN }, uMaxY: { value: LIQ_MAX },
        uDeep: { value: new THREE.Color('#2a0b01') },
        uMid: { value: new THREE.Color('#9a4a0e') },
        uBright: { value: new THREE.Color('#e3913a') },
      },
    });
    liquid.material = this.liquidMat;

    // DIP TUBE — additive glint drawn over the perfume
    const tube = get('Tube');
    this.tubeMat = new THREE.ShaderMaterial({
      vertexShader: tubeVertex, fragmentShader: tubeFragment,
      uniforms: { uReveal: { value: 0 }, uCut: { value: 2.43 } },
      blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: false,
    });
    tube.material = this.tubeMat;
    tube.renderOrder = 1;

    // CAP — black textured wood
    const grain = this.#woodGrain();
    this.capMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#0b0a09'), roughness: 0.6, roughnessMap: grain, bumpMap: grain, bumpScale: 1.4,
      metalness: 0, clearcoat: 0.2, clearcoatRoughness: 0.5, envMapIntensity: 0.8,
    });
    get('Cap').material = this.capMat;

    // COLLAR — champagne metal
    this.metalMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#d9c7a5'), metalness: 1, roughness: 0.18, envMapIntensity: 1.6 });
    get('Collar').material = this.metalMat;

    // LABEL — the COURAGE print (texture embedded in the GLB, made from the logo)
    const label = get('Label');
    const labelTex = label.material.map;
    labelTex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.labelMat = new THREE.MeshStandardMaterial({
      map: labelTex, color: new THREE.Color('#f6dfb8'), metalness: 0.7, roughness: 0.3,
      emissive: new THREE.Color('#b8925a'), emissiveMap: labelTex, emissiveIntensity: 0,
      transparent: true, depthWrite: false, alphaTest: 0.02, envMapIntensity: 1.4,
    });
    label.material = this.labelMat;
    label.renderOrder = 3;

    // warm backlight card (hidden behind the bottle silhouette)
    this.cardMat = new THREE.ShaderMaterial({ vertexShader: ringVertex, fragmentShader: cardFragment, uniforms: { uIntensity: { value: 0 } } });
    const card = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.48), this.cardMat);
    card.position.set(0, (0.02 + 2.5) / 2 - BOTTLE_H / 2, -1.25);
    this.pivot.add(card);

    // anchors for DOM callouts (bottle-local, non-rotating frame)
    this.anchors = {
      cap: new THREE.Vector3(0.6, 3.15 - BOTTLE_H / 2, 0),
      body: new THREE.Vector3(-1.0, 1.55 - BOTTLE_H / 2, 0),
      base: new THREE.Vector3(1.0, 0.32 - BOTTLE_H / 2, 0),
    };

    this.ready = true;
    this.#applyPose(0);
  }

  #woodGrain() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 1024;
    const g = c.getContext('2d');
    g.fillStyle = '#6a6a6a';
    g.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 520; i++) {
      const x = Math.random() * c.width;
      const w = 0.4 + Math.random() * 1.8;
      const v = Math.floor(40 + Math.random() * 160);
      g.strokeStyle = `rgba(${v},${v},${v},${0.25 + Math.random() * 0.5})`;
      g.lineWidth = w;
      g.beginPath();
      let px = x;
      g.moveTo(px, 0);
      for (let y = 0; y <= c.height; y += 32) {
        px += (Math.random() - 0.5) * 1.6;
        g.lineTo(px, y);
      }
      g.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    return tex;
  }

  // ───────────────────────────────────────── API
  setTarget(p) { Object.assign(this.target, p); }
  setPointer(x, y) { this.pointer.set(x, y); }
  setScroll(norm, velocity) { this.scrollNorm = norm; this.velocity = velocity; }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.width = w; this.height = h;
    this.camera.aspect = w / h;
    // keep the bottle comfortably inside narrow (portrait) screens
    this.camera.fov = w / h < 0.75 ? 34 : 28;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(this.dpr);
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w / 2, h / 2);
    this.sparkMat.uniforms.uPixelRatio.value = this.dpr;
  }

  /** screen-space (px) positions of the callout anchors */
  getAnchors() {
    if (!this.ready) return null;
    const out = {};
    const v = new THREE.Vector3();
    this.ringGroup.updateMatrixWorld();
    for (const [k, a] of Object.entries(this.anchors)) {
      v.copy(a).applyMatrix4(this.ringGroup.matrixWorld).project(this.camera);
      out[k] = { x: (v.x * 0.5 + 0.5) * this.width, y: (-v.y * 0.5 + 0.5) * this.height };
    }
    return out;
  }

  #applyPose(dt) {
    const p = this.pose;
    const t = this.target;
    const k = dt === 0 ? 1e6 : 6.5;
    for (const key of POSE_KEYS) p[key] = damp(p[key], t[key], key === 'rotY' ? 5 : k, dt || 1);

    this.pointerS.x = damp(this.pointerS.x, this.pointer.x, 3, dt || 1);
    this.pointerS.y = damp(this.pointerS.y, this.pointer.y, 3, dt || 1);

    if (!this.ready) return;
    const float = Math.sin(this.time * 0.9) * 0.06;
    this.pivot.position.set(p.x + this.pointerS.x * 0.12, p.y + float, p.z);
    this.pivot.scale.setScalar(p.scale);
    this.pivot.rotation.set(this.pointerS.y * 0.08, 0, p.tilt + this.pointerS.x * -0.03);
    this.spin.rotation.y = p.rotY + this.pointerS.x * 0.35;

    this.ringGroup.position.set(p.x, p.y + float, p.z);
    this.ringGroup.scale.setScalar(p.scale / 0.78);
    this.ringGroup.rotation.set(this.pointerS.y * 0.12, this.pointerS.x * 0.2, p.tilt);

    const r = THREE.MathUtils.clamp(p.reveal, 0, 1.2);
    this.scene.environmentIntensity = r;
    this.key.intensity = 1.6 * r;
    this.sweep.intensity = 2.2 * r;
    this.rim.intensity = 1.2 * r;
    this.sweep.position.set(Math.sin(this.time * 0.35 + p.rotY) * 7, 2, Math.cos(this.time * 0.35 + p.rotY) * 6 + 3);

    const lu = this.liquidMat.uniforms;
    lu.uReveal.value = r;
    lu.uFill.value = THREE.MathUtils.clamp(p.fill, 0, 1);
    lu.uGlow.value = 0.35 + p.glow * 0.65;
    lu.uWobble.value = Math.min(1, Math.abs(this.target.fill - p.fill) * 6 + Math.abs(this.velocity) * 0.6) + 0.15;
    this.tubeMat.uniforms.uReveal.value = r;
    this.cardMat.uniforms.uIntensity.value = r * (0.35 + 0.65 * lu.uFill.value);
    this.labelMat.emissiveIntensity = 0.45 * r;
    this.labelMat.opacity = Math.min(1, r * 1.4);

    const ring = THREE.MathUtils.clamp(p.ring, 0, 1);
    this.haloMat.uniforms.uProgress.value = ring;
    this.haloMat.uniforms.uOpacity.value = Math.min(1, ring * 3);
    const hud = THREE.MathUtils.clamp(p.hud, 0, 1);
    for (const m of [this.ticks, this.dashes, this.inner]) {
      m.material.uniforms.uProgress.value = hud;
      m.material.uniforms.uOpacity.value = m.material.userData.base * Math.min(1, hud * 2);
    }
    this.ticks.rotation.z = -this.time * 0.05;
    this.dashes.rotation.z = this.time * 0.08;
    this.inner.rotation.z = -this.time * 0.22;
  }

  render() {
    const now = performance.now();
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    this.time += dt;
    this.#applyPose(dt);

    this.sparkMat.uniforms.uTime.value = this.time;
    this.sparkMat.uniforms.uScroll.value = this.scrollNorm;
    this.haloMat.uniforms.uTime.value = this.time;
    if (this.liquidMat) this.liquidMat.uniforms.uTime.value = this.time;

    this.camera.position.x = damp(this.camera.position.x, this.pointerS.x * 0.25, 2, dt);
    this.camera.position.y = damp(this.camera.position.y, this.pointerS.y * 0.15, 2, dt);
    this.camera.lookAt(0, 0, 0);

    this.finalPass.uniforms.uVelocity.value = damp(this.finalPass.uniforms.uVelocity.value, THREE.MathUtils.clamp(this.velocity, -2, 2), 8, dt);
    this.finalPass.uniforms.uTime.value = this.time;
    this.composer.render(dt);
  }
}
