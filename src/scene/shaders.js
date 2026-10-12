// ─────────────────────────────────────────────────────────────
//  GLSL — perfume liquid, dip tube, halo rings, sparkles, post FX
// ─────────────────────────────────────────────────────────────

export const liquidVertex = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vPos;
  void main() {
    vPos = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

export const liquidFragment = /* glsl */ `
  uniform float uTime;
  uniform float uFill;
  uniform float uReveal;
  uniform float uGlow;
  uniform float uWobble;
  uniform float uMinY;
  uniform float uMaxY;
  uniform vec3 uDeep;
  uniform vec3 uMid;
  uniform vec3 uBright;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vPos;

  void main() {
    float level = mix(uMinY - 0.03, uMaxY + 0.02, uFill);
    float wob = (sin(vPos.x * 3.1 + uTime * 2.3) * 0.5 + sin(vPos.z * 3.7 - uTime * 1.7) * 0.5) * 0.035 * uWobble;
    if (vPos.y > level + wob) discard;

    float h = clamp((vPos.y - uMinY) / (uMaxY - uMinY), 0.0, 1.0);

    if (!gl_FrontFacing) {
      // the open cut seen from above = liquid surface
      vec3 s = mix(uMid, uBright, 0.35) * (0.8 + 0.4 * uGlow);
      gl_FragColor = vec4(s * uReveal, 1.0);
      return;
    }

    vec3 N = normalize(vN);
    float facing = clamp(dot(N, normalize(vV)), 0.0, 1.0);
    float rim = 1.0 - facing;

    // backlit amber: honey in the centre, deep resin towards the edges
    vec3 col = mix(uMid, uBright, pow(facing, 3.0));
    col = mix(col, uDeep, smoothstep(0.45, 1.0, rim));
    // bright vertical caustic where the backlight focuses through the cylinder
    col += uBright * pow(facing, 14.0) * 0.35;
    // light enters through the heavy base, darker towards the surface
    col *= mix(1.3, 0.7, smoothstep(0.0, 1.0, h));
    // meniscus band
    float band = smoothstep(level - 0.1, level - 0.01, vPos.y);
    col = mix(col, uDeep * 1.6, band * 0.6);
    // slow caustic shimmer
    float c = sin(vPos.x * 8.0 + uTime * 0.6) * sin(vPos.y * 6.0 - uTime * 0.45) * sin(vPos.z * 7.0 + uTime * 0.5);
    col += uBright * max(c, 0.0) * 0.18 * facing;
    col *= 0.58 + 0.55 * uGlow;

    gl_FragColor = vec4(col * uReveal, 1.0);
  }
`;

export const tubeVertex = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  varying float vY;
  void main() {
    vY = position.y;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

export const tubeFragment = /* glsl */ `
  uniform float uReveal;
  uniform float uCut;
  varying vec3 vN;
  varying vec3 vV;
  varying float vY;
  void main() {
    if (vY > uCut) discard;
    float rim = 1.0 - abs(dot(normalize(vN), normalize(vV)));
    float a = pow(rim, 2.5) * 0.55 + 0.04;
    gl_FragColor = vec4(vec3(1.0, 0.93, 0.82) * a * uReveal, 1.0);
  }
`;

// thin ring that draws itself like the "O" of the monogram
export const ringVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const haloFragment = /* glsl */ `
  uniform float uProgress;
  uniform float uOpacity;
  uniform vec3 uColor;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    float u = fract(vUv.x + 0.25);
    if (u > uProgress) discard;
    float head = smoothstep(uProgress - 0.12, uProgress, u) * step(uProgress, 0.999);
    float pulse = 0.75 + 0.25 * sin(u * 40.0 - uTime * 2.0);
    vec3 c = uColor * (0.9 + head * 4.0) * pulse;
    gl_FragColor = vec4(c * uOpacity, 1.0);
  }
`;

// dashed / ticked HUD rings (RingGeometry, uv mapped by angle in shader)
export const hudRingVertex = /* glsl */ `
  varying vec2 vP;
  void main() {
    vP = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const hudRingFragment = /* glsl */ `
  uniform float uOpacity;
  uniform float uSegments;
  uniform float uDuty;
  uniform float uProgress;
  uniform vec3 uColor;
  varying vec2 vP;
  void main() {
    float a = atan(vP.y, vP.x) / 6.2831853 + 0.5;
    if (a > uProgress) discard;
    float seg = fract(a * uSegments);
    if (seg > uDuty) discard;
    gl_FragColor = vec4(uColor * uOpacity, 1.0);
  }
`;

export const sparkVertex = /* glsl */ `
  attribute float aScale;
  attribute float aSeed;
  attribute float aType;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uScroll;
  uniform float uHeight;
  varying float vAlpha;
  varying float vType;
  void main() {
    vec3 p = position;
    float depth = clamp((p.z + 12.0) / 16.0, 0.0, 1.0);
    p.y += uTime * (0.04 + aSeed * 0.08) + uScroll * (0.8 + depth * 2.2);
    p.y = mod(p.y + uHeight * 0.5, uHeight) - uHeight * 0.5;
    p.x += sin(uTime * 0.2 + aSeed * 30.0) * 0.25;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float tw = 0.5 + 0.5 * sin(uTime * (0.8 + aSeed * 2.5) + aSeed * 40.0);
    vAlpha = mix(0.25, 1.0, tw) * (0.35 + depth * 0.65);
    vType = aType;
    float s = uSize * aScale * (aType > 0.5 ? 3.2 * (0.6 + tw * 0.6) : 1.0);
    gl_PointSize = s * uPixelRatio * (10.0 / -mv.z);
  }
`;

export const sparkFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  varying float vType;
  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float a;
    if (vType > 0.5) {
      // four-pointed star, like the sparkles in the LONDUVE logo
      float cross = max(exp(-abs(p.x) * 14.0) * (1.0 - abs(p.y)), exp(-abs(p.y) * 14.0) * (1.0 - abs(p.x)));
      float core = exp(-dot(p, p) * 9.0);
      a = clamp(cross * 1.3 + core, 0.0, 1.5);
    } else {
      float d = length(p);
      a = smoothstep(1.0, 0.0, d);
      a *= a;
    }
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor * a * vAlpha * uOpacity, 1.0);
  }
`;

// final pass: velocity chromatic aberration + soft vignette
export const finalShader = {
  uniforms: {
    tDiffuse: { value: null },
    uVelocity: { value: 0 },
    uTime: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uVelocity;
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      vec2 c = vUv - 0.5;
      float d = length(c);
      float k = 0.0006 + abs(uVelocity) * 0.01;
      vec2 off = c * k * (0.5 + d * 2.0);
      // slight vertical stretch when scrolling fast
      vec2 uv = vUv + vec2(0.0, c.y * abs(uVelocity) * -0.015);
      float r = texture2D(tDiffuse, uv + off).r;
      vec4 g = texture2D(tDiffuse, uv);
      float b = texture2D(tDiffuse, uv - off).b;
      vec3 col = vec3(r, g.g, b);
      col *= mix(1.0, 0.62, smoothstep(0.35, 0.85, d));
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

// ─────────────────────────────────────────────────────────────
//  Notes: every photo is revealed inside its arch by a noise dissolve
//  with a molten-gold front, RGB split and scan-lines ("futuristic" reveal)
// ─────────────────────────────────────────────────────────────
export const notesVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

// one note photo inside its arch: revealed by the molten-gold front (uProgress 0 → 1),
// hover ripple + zoom, dimmed while another note is hovered. Output is premultiplied alpha.
export const notesFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uTex;
  uniform vec2 uTexRes;
  uniform vec2 uRes;
  uniform float uRadius;
  uniform float uProgress;
  uniform float uTime;
  uniform float uVelocity;
  uniform vec2 uMouse;
  uniform float uHover;
  uniform float uDim;
  uniform float uSeed;
  varying vec2 vUv;

  vec2 cover(vec2 uv, vec2 img) {
    float rs = uRes.x / uRes.y;
    float ri = img.x / img.y;
    vec2 s = rs < ri ? vec2(rs / ri, 1.0) : vec2(1.0, ri / rs);
    return (uv - 0.5) * s + 0.5;
  }

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }

  vec3 sampleSplit(sampler2D t, vec2 uv, vec2 dir, float amt) {
    return vec3(texture2D(t, uv + dir * amt).r, texture2D(t, uv).g, texture2D(t, uv - dir * amt).b);
  }

  // signed distance (px) to the arch: half-circle top, straight sides, small rounded bottom corners
  float archSd(vec2 p, vec2 s, float rb) {
    float r = s.x * 0.5;
    vec2 q = vec2(abs(p.x - r), p.y);
    float cy = max(s.y - r, 0.0);
    if (q.y > cy) return length(vec2(q.x, q.y - cy)) - r;
    if (q.y < rb && q.x > r - rb) return length(vec2(q.x - (r - rb), q.y - rb)) - rb;
    return max(q.x - r, -q.y);
  }

  void main() {
    float inside = 1.0 - smoothstep(-0.75, 0.75, archSd(vUv * uRes, uRes, uRadius));
    if (inside <= 0.0) { gl_FragColor = vec4(0.0); return; }

    vec2 uv = vUv;
    float p = uProgress;

    // hover ripple
    vec2 m = uv - uMouse;
    float md = length(m * vec2(uRes.x / uRes.y, 1.0));
    uv += normalize(m + 1e-5) * sin(md * 28.0 - uTime * 4.0) * 0.004 * uHover * smoothstep(0.35, 0.0, md);

    float n = fbm(uv * vec2(2.2, 3.6) + vec2(uSeed, uTime * 0.04));
    float sweep = uv.y * 0.62 + n * 0.38;                          // the photo rises from the bottom
    float edge = mix(-0.15, 1.15, p);
    float w = 0.07;
    float mask = 1.0 - smoothstep(edge - w, edge + w, sweep);       // 1 → photo
    float band = exp(-pow((sweep - edge) / 0.045, 2.0)) * smoothstep(0.0, 0.04, p) * smoothstep(1.0, 0.96, p);
    float trans = sin(p * 3.14159);

    vec2 st = (cover(uv, uTexRes) - 0.5) * (1.0 - (1.0 - p) * 0.12 - uHover * 0.045) + 0.5;
    st -= vec2((n - 0.5) * 0.06, 0.05) * band;
    float split = band * 0.012 + trans * 0.003 + abs(uVelocity) * 0.006 + uHover * 0.0015;
    vec3 col = sampleSplit(uTex, st, vec2(0.0, 1.0), split);

    // molten gold front + scan-lines
    vec3 gold = vec3(1.0, 0.68, 0.32);
    float scan = 0.75 + 0.25 * sin(uv.y * uRes.y * 0.9);
    col = mix(col, col * 0.35 + gold * 1.05, band * 0.9 * scan);
    col += vec3(1.0, 0.86, 0.62) * pow(band, 8.0) * 0.55;

    // vignette inside the arch, dim while another note is hovered
    float vg = smoothstep(1.1, 0.35, length((vUv - vec2(0.5, 0.45)) * vec2(1.25, 1.0)));
    col *= mix(0.55, 1.0, vg);
    col *= 1.0 - uDim * 0.5;

    // film grain
    col += (hash(vUv * uRes + fract(uTime) * 100.0) - 0.5) * 0.035;

    // holographic scan grid running just ahead of the front
    float ghost = step(0.9, fract(vUv.y * uRes.y / 6.0)) * trans * 0.22 * (1.0 - mask) * smoothstep(edge + 0.45, edge, sweep);

    float a = clamp(max(mask, band), 0.0, 1.0);
    vec3 outc = max(col, 0.0) * a + gold * ghost;
    gl_FragColor = vec4(outc * inside, clamp(a + ghost, 0.0, 1.0) * inside);
  }
`;

// hidden warm card behind the bottle: the glass base & shoulder refract it,
// like the backlight card used in the Blender studio scene
export const cardFragment = /* glsl */ `
  uniform float uIntensity;
  varying vec2 vUv;
  void main() {
    vec3 warm = vec3(0.62, 0.26, 0.05);
    vec3 deep = vec3(0.10, 0.035, 0.005);
    float base = 1.0 - smoothstep(0.02, 0.26, vUv.y);
    float shoulder = smoothstep(0.8, 0.95, vUv.y);
    vec3 c = mix(deep, warm, max(base, shoulder * 0.7));
    c *= smoothstep(0.5, 0.18, abs(vUv.x - 0.5));
    gl_FragColor = vec4(c * uIntensity, 1.0);
  }
`;
