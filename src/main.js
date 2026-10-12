// ─────────────────────────────────────────────────────────────
//  LONDUVE — N°01 COURAGE · one-page experience
// ─────────────────────────────────────────────────────────────
import '@fontsource/cormorant-garamond/latin-300.css';
import '@fontsource/cormorant-garamond/latin-300-italic.css';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-400-italic.css';
import '@fontsource/cinzel/latin-400.css';
import '@fontsource/cinzel/latin-500.css';
import '@fontsource/manrope/latin-300.css';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import './styles/main.css';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import Lenis from 'lenis';

import { CONFIG, isPlaceholderEmail } from './config.js';
import { detectLang, setLang, t, onLangChange } from './i18n.js';
import { $, $$, clamp, lerp, range, smooth, easeInOut, splitChars, loadImage, webglAvailable } from './utils.js';
import { Experience, POSE_KEYS } from './scene/Experience.js';
import { NotesGallery } from './scene/NotesGallery.js';

gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin);

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;
const isMobile = () => window.innerWidth <= 820;
// Vite's base path ("/" locally, "/<repo-name>/" on GitHub Pages) — prefix every runtime asset URL with it.
const BASE = import.meta.env.BASE_URL;
const NOTE_IMAGES = ['note-nutmeg.webp', 'note-florals.webp', 'note-vanilla.webp', 'note-caramel.webp'].map((f) => `${BASE}img/${f}`);

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

setLang(detectLang(), { silent: true });
$('.js-year').textContent = String(new Date().getFullYear());

// ───────────────────────────────────────── contact links from config
function applyLinks() {
  const wa = `https://wa.me/${CONFIG.whatsapp}`;
  $$('.js-wa').forEach((a) => { a.href = wa; });
  $('.js-wa-order').href = `${wa}?text=${encodeURIComponent(t('order.prefill'))}`;
  $('.js-wa-label').textContent = `+${CONFIG.whatsapp}`;
  $('.js-ig').href = `https://instagram.com/${CONFIG.instagram}`;
  $('.js-ig-label').textContent = `@${CONFIG.instagram}`;
  $('.js-mail').href = `mailto:${CONFIG.email}`;
  $('.js-mail-label').textContent = CONFIG.email;
}
applyLinks();

// ───────────────────────────────────────── WebGL stage
let exp = null;
let gallery = null;
if (webglAvailable()) {
  try {
    exp = new Experience($('.webgl'), { mobile: isMobile() || !finePointer });
  } catch (e) {
    console.warn('[londuve] WebGL unavailable', e);
    exp = null;
  }
}
if (!exp) document.documentElement.classList.add('no-webgl');

// ───────────────────────────────────────── loader
const loader = { glb: 0, img: 0, font: 0, shown: 0 };
const countEl = $('.loader__count');
const loaderEl = $('.loader');
function loaderProgress() {
  const p = loader.glb * 0.55 + loader.img * 0.35 + loader.font * 0.1;
  return clamp(p);
}
const loaderTick = () => {
  loader.shown = lerp(loader.shown, loaderProgress(), 0.08);
  const v = Math.round(loader.shown * 100);
  countEl.textContent = String(v).padStart(3, '0');
  loaderEl.style.setProperty('--p', `${v}%`);
  loaderEl.style.setProperty('--s', loader.shown.toFixed(3));
};
gsap.ticker.add(loaderTick);

async function preload() {
  let imgsDone = 0;
  const imgs = Promise.all(NOTE_IMAGES.map((src) => loadImage(src).then((img) => {
    imgsDone += 1; loader.img = imgsDone / NOTE_IMAGES.length; return img;
  })));
  const fonts = (document.fonts?.ready ?? Promise.resolve()).then(() => Promise.all([
    document.fonts.load('300 40px "Cormorant Garamond"'),
    document.fonts.load('400 20px "Cinzel"'),
    document.fonts.load('400 12px "IBM Plex Mono"'),
  ])).catch(() => {}).then(() => { loader.font = 1; });
  const glb = exp
    ? exp.load(`${BASE}models/courage.glb`, (p) => { loader.glb = p; }).then(() => { loader.glb = 1; })
    : Promise.resolve().then(() => { loader.glb = 1; });
  const minTime = new Promise((r) => setTimeout(r, reduced ? 200 : 1400));
  const [noteImgs] = await Promise.all([imgs, fonts, glb, minTime]);
  return noteImgs;
}

// ───────────────────────────────────────── smooth scroll
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, touchMultiplier: 1.4, syncTouch: false });
  lenis.stop();
  lenis.on('scroll', ScrollTrigger.update);
}
gsap.ticker.lagSmoothing(0);

const scrollTo = (target, opts = {}) => {
  if (lenis) lenis.scrollTo(target, { duration: 2.2, easing: (x) => 1 - Math.pow(1 - x, 4), ...opts });
  else (typeof target === 'number' ? window.scrollTo({ top: target }) : $(target)?.scrollIntoView());
};
$$('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    e.preventDefault();
    scrollTo(id === '#top' ? 0 : id);
  });
});

// ───────────────────────────────────────── scroll → bottle pose keyframes
let keys = [];
const HIDDEN = { x: 0, y: -6.4, z: 0, rotY: -1.3, tilt: 0, scale: 0.78, reveal: 0, fill: 0, ring: 0, hud: 0, glow: 0 };

function buildKeys() {
  const vh = window.innerHeight;
  const mob = isMobile();
  const sec = (id) => { const el = $(id); return { top: el.offsetTop, len: Math.max(1, el.offsetHeight - vh) }; };
  const E = sec('#emblem'); const C = sec('#courage'); const X = sec('#extrait'); const N = sec('#notes');
  const S = mob ? 0.7 : 0.78;
  const TAU = Math.PI * 2;
  const centre = { ...HIDDEN, y: 0, scale: S };
  const side = mob
    ? { x: 0, y: 1.55, scale: 0.46, tilt: 0 }
    : { x: -2.6, y: -0.05, scale: 0.74, tilt: 0.09 };
  keys = [
    { at: 0, pose: { ...HIDDEN, scale: S } },
    { at: E.top + E.len * 0.5, pose: { ...HIDDEN, scale: S } },
    { at: E.top + E.len, pose: { ...centre, rotY: -0.55, reveal: 0.5 } },
    { at: C.top + C.len * 0.24, pose: { ...centre, rotY: 0.3, reveal: 1, fill: 1, ring: 1 }, ease: 'lin' },
    { at: C.top + C.len * 0.55, pose: { ...centre, rotY: Math.PI * 1.05, reveal: 1, fill: 1, ring: 1, hud: 1 }, ease: 'lin' },
    { at: C.top + C.len, pose: { ...centre, rotY: TAU, reveal: 1, fill: 1, ring: 1, hud: 1 } },
    { at: X.top + X.len * 0.22, pose: { ...centre, ...side, rotY: TAU + 0.45, reveal: 1.05, fill: 1, ring: 1, hud: 0, glow: 0.2 }, ease: 'lin' },
    { at: X.top + X.len, pose: { ...centre, ...side, rotY: TAU + 1.0, reveal: 1.1, fill: 1, ring: 1, hud: 0, glow: 1 } },
    { at: N.top, pose: { ...centre, ...side, y: 6.6, rotY: TAU + 2.1, reveal: 0.6, fill: 1, ring: 0, hud: 0, glow: 1 } },
  ];
}

function poseAt(scroll) {
  if (!keys.length) return HIDDEN;
  if (scroll <= keys[0].at) return keys[0].pose;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (scroll < b.at) {
      let k = (scroll - a.at) / Math.max(1, b.at - a.at);
      k = a.ease === 'lin' ? k : easeInOut(k);
      const out = {};
      for (const key of POSE_KEYS) out[key] = lerp(a.pose[key], b.pose[key], k);
      return out;
    }
  }
  return keys[keys.length - 1].pose;
}

// ───────────────────────────────────────── text splitting
const sloganA = splitChars($('.slogan__line--a'));
const sloganB = splitChars($('.slogan__line--b'));
let noteChars = [];
function splitNotes() {
  noteChars = $$('.note__name').map((el) => { delete el.dataset.splitSource; return splitChars(el); });
}
splitNotes();

// ───────────────────────────────────────── scroll animations
function buildScrollAnimations() {
  // HERO out
  gsap.timeline({ scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } })
    .to('.hero__inner', { yPercent: -28, scale: 0.92, opacity: 0, filter: 'blur(8px)', ease: 'none' }, 0)
    .to('.scroll-cue, .hero__side', { opacity: 0, ease: 'none', duration: 0.3 }, 0);

  // EMBLEM — Londuve Fragrance logo opens the perfume part, then hands over to the 3D bottle
  gsap.timeline({ scrollTrigger: { trigger: '#emblem', start: 'top 65%', end: 'bottom bottom', scrub: true } })
    .fromTo('.emblem__logo', { scale: 0.8, opacity: 0, filter: 'blur(14px)' }, { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 0.3, ease: 'power2.out' }, 0)
    .fromTo('.emblem__glow', { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'power2.out' }, 0)
    .fromTo('.emblem__caption > *', { y: 24, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.04, duration: 0.15 }, 0.22)
    .to('.emblem__caption > *', { y: -20, opacity: 0, stagger: 0.03, duration: 0.12 }, 0.56)
    .to('.emblem__logo', { scale: 0.55, yPercent: -55, opacity: 0, filter: 'blur(10px)', duration: 0.3, ease: 'power2.in' }, 0.6)
    .to('.emblem__glow', { scale: 1.8, opacity: 0, duration: 0.3 }, 0.6)
    .to({}, { duration: 0.1 });

  // COURAGE — slogan + HUD callouts
  gsap.set([...sloganA, ...sloganB], { yPercent: 120, opacity: 0, rotateX: -70, filter: 'blur(6px)', transformPerspective: 600 });
  gsap.set('.courage__kicker, .courage__text', { opacity: 0, y: 20 });
  gsap.set('.callout', { opacity: 0, '--d': 0 });
  const ct = gsap.timeline({ scrollTrigger: { trigger: '#courage', start: 'top top', end: 'bottom bottom', scrub: true } });
  ct.to(sloganA, { yPercent: 0, opacity: 1, rotateX: 0, filter: 'blur(0px)', stagger: 0.012, duration: 0.14, ease: 'power3.out' }, 0.04)
    .to(sloganB, { yPercent: 0, opacity: 1, rotateX: 0, filter: 'blur(0px)', stagger: 0.012, duration: 0.14, ease: 'power3.out' }, 0.12)
    .to('.courage__kicker, .courage__text', { opacity: 1, y: 0, stagger: 0.03, duration: 0.1 }, 0.2)
    .to([...sloganA, ...sloganB], { yPercent: -80, opacity: 0, filter: 'blur(8px)', stagger: 0.004, duration: 0.1, ease: 'power2.in' }, 0.5)
    .to('.courage__kicker, .courage__text', { opacity: 0, y: -20, duration: 0.08 }, 0.5)
    .to('.callout', { opacity: 1, duration: 0.05, stagger: 0.06 }, 0.6)
    .to('.callout', { '--d': 1, duration: 0.1, stagger: 0.06, ease: 'power2.out' }, 0.6)
    .to('.callout', { opacity: 0, duration: 0.06 }, 0.93)
    .to({}, { duration: 0.01 }, 0.99);

  // EXTRAIT — 42% counter filling with liquid, scramble, concentration scale
  const num = $('.bignum__val');
  const bignum = $('.bignum');
  const counter = { v: 0 };
  const drawCounter = () => {
    const v = Math.round(counter.v);
    const s = String(v).padStart(2, '0');
    if (num.textContent !== s) { num.textContent = s; num.dataset.text = s; }
    bignum.style.setProperty('--fill', (counter.v / CONFIG.product.concentration).toFixed(4));
  };
  drawCounter();
  const content = $$('.extrait__content > *');
  gsap.set(content, { opacity: 0, x: isMobile() ? 0 : 60, y: isMobile() ? 30 : 0 });
  gsap.set('.scale__row', { '--g': 0 });
  gsap.set('.scale__marker', { '--m': 0 });
  const xt = gsap.timeline({ scrollTrigger: { trigger: '#extrait', start: 'top top', end: 'bottom bottom', scrub: true } });
  xt.to(content, { opacity: 1, x: 0, y: 0, stagger: 0.025, duration: 0.14, ease: 'power3.out' }, 0.08)
    .to(counter, { v: CONFIG.product.concentration, duration: 0.42, ease: 'power1.inOut', onUpdate: drawCounter }, 0.1)
    .to('.scale__row', { '--g': 1, stagger: 0.05, duration: 0.12, ease: 'power2.out' }, 0.45)
    .to('.scale__marker', { '--m': 1, duration: 0.1, ease: 'power2.out' }, 0.68)
    .to({}, { duration: 0.2 }, 0.8);
  const label = $('.extrait__label');
  ScrollTrigger.create({
    trigger: '#extrait', start: 'top 20%',
    onEnter: () => gsap.to(label, { duration: 1.2, scrambleText: { text: t('extrait.label'), chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789%', speed: 0.5 } }),
    onEnterBack: () => gsap.to(label, { duration: 0.8, scrambleText: { text: t('extrait.label'), chars: 'upperCase', speed: 0.6 } }),
  });

  // NOTES — scroll-scrubbed shader slideshow
  gsap.fromTo('.notes__frame', { clipPath: 'inset(100% 0% 0% 0% round 999px 999px 18px 18px)' }, {
    clipPath: 'inset(0% 0% 0% 0% round 999px 999px 18px 18px)', ease: 'none',
    scrollTrigger: { trigger: '#notes', start: 'top 85%', end: 'top top', scrub: true },
  });
  gsap.fromTo('.notes__head > *, .pyramid li', { opacity: 0, y: 30 }, {
    opacity: 1, y: 0, stagger: 0.05, ease: 'none',
    scrollTrigger: { trigger: '#notes', start: 'top 60%', end: 'top 5%', scrub: true },
  });
  ScrollTrigger.create({
    trigger: '#notes', start: 'top top', end: 'bottom bottom',
    onUpdate: (self) => updateNotes(self.progress),
  });
  updateNotes(0, true);

  // ORDER
  gsap.timeline({ scrollTrigger: { trigger: '.order', start: 'top 80%', end: 'top 15%', scrub: true } })
    .to('.order__arch', { clipPath: 'inset(0% 0 0 0 round 999px 999px 18px 18px)', ease: 'none' }, 0)
    .to('.order__arch img', { scale: 1, ease: 'none' }, 0)
    .fromTo('.order__ring', { rotate: -40, opacity: 0, scale: 0.8 }, { rotate: 0, opacity: 1, scale: 1, ease: 'none' }, 0);
  gsap.to('.order__arch img', { yPercent: -10, ease: 'none', scrollTrigger: { trigger: '.order', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.order__info > *', {
    opacity: 0, y: 40, stagger: 0.07, duration: 1.1, ease: 'power3.out',
    scrollTrigger: { trigger: '.order__info', start: 'top 75%' },
  });

  // CONTACT + FOOTER
  gsap.from('.contact__head > *, .form > .field, .form__submit', {
    opacity: 0, y: 40, stagger: 0.06, duration: 1.1, ease: 'power3.out',
    scrollTrigger: { trigger: '.contact', start: 'top 70%' },
  });
  gsap.from('.footer__mark', {
    opacity: 0, yPercent: 30, filter: 'blur(10px)', duration: 1.6, ease: 'power3.out',
    scrollTrigger: { trigger: '.footer', start: 'top 85%' },
  });

  // HUD — section readout
  const hudIdx = $('.hud__idx');
  const hudName = $('.hud__name');
  $$('[data-section]').forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec, start: 'top 50%', end: 'bottom 50%',
      onToggle: (self) => {
        if (!self.isActive) return;
        hudIdx.textContent = sec.dataset.section;
        gsap.to(hudName, { duration: 0.7, scrambleText: { text: sec.dataset.name, chars: 'upperCase', speed: 0.7 } });
        $$('.nav__links a').forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${sec.id}`));
      },
    });
  });
}

// ───────────────────────────────────────── notes logic
let activeNote = -1;
const notes = $$('.note');
const levels = $$('.pyramid li');
const NOTE_LEVEL = [0, 1, 2, 2];
function updateNotes(progress, force = false) {
  const n = NOTE_IMAGES.length;
  const s = clamp((progress - 0.03) / 0.9);
  const raw = s * (n - 1);
  const i = Math.min(Math.floor(raw), n - 2);
  const f = raw - i;
  const tt = i + smooth(range(f, 0.18, 0.82));
  gallery?.setProgress(tt);
  $('.pyramid').style.setProperty('--p', (tt / (n - 1)).toFixed(3));
  const idx = Math.round(tt);
  if (idx !== activeNote || force) showNote(idx, activeNote, force);
}

function showNote(idx, prev, instant) {
  activeNote = idx;
  $('.notes__i').textContent = String(idx + 1).padStart(2, '0');
  levels.forEach((li, k) => li.classList.toggle('is-active', k === NOTE_LEVEL[idx]));
  if (!gallery) {
    const fb = $('.notes__fallback');
    if (fb) fb.src = NOTE_IMAGES[idx];
  }
  notes.forEach((note, k) => {
    const chars = noteChars[k];
    const extra = $$('.note__level, .note__text', note);
    gsap.killTweensOf([...chars, ...extra]);
    if (k === idx) {
      note.classList.add('is-active');
      gsap.fromTo(chars, { yPercent: 70, opacity: 0, filter: 'blur(8px)' }, { yPercent: 0, opacity: 1, filter: 'blur(0px)', duration: instant ? 0 : 0.9, stagger: instant ? 0 : 0.025, ease: 'power3.out', delay: instant ? 0 : 0.15 });
      gsap.fromTo(extra, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: instant ? 0 : 0.8, stagger: 0.08, ease: 'power3.out', delay: instant ? 0 : 0.25 });
    } else {
      note.classList.remove('is-active');
      const dir = k < idx ? -1 : 1;
      if (instant) gsap.set([...chars, ...extra], { opacity: 0 });
      else {
        gsap.to(chars, { yPercent: -60 * dir, opacity: 0, filter: 'blur(6px)', duration: 0.45, stagger: 0.012, ease: 'power2.in' });
        gsap.to(extra, { opacity: 0, y: -10 * dir, duration: 0.35, ease: 'power2.in' });
      }
    }
  });
}

// ───────────────────────────────────────── callouts follow the bottle
const callouts = $$('.callout');
function updateCallouts() {
  if (!exp) return;
  const a = exp.getAnchors();
  if (!a) return;
  callouts.forEach((el) => {
    const p = a[el.dataset.anchor];
    el.style.setProperty('--x', `${p.x.toFixed(1)}px`);
    el.style.setProperty('--y', `${p.y.toFixed(1)}px`);
  });
}

// ───────────────────────────────────────── nav + progress
const nav = $('.nav');
const hudPct = $('.hud__pct');
const hudBar = $('.hud__progress');
let lastScroll = 0;
function onScroll(scroll) {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const p = max > 0 ? scroll / max : 0;
  hudPct.textContent = String(Math.round(p * 100)).padStart(3, '0');
  hudBar.style.setProperty('--p', p.toFixed(4));
  nav.classList.toggle('is-scrolled', scroll > 40);
  if (scroll > window.innerHeight * 0.8 && scroll > lastScroll + 4) nav.classList.add('is-hidden');
  else if (scroll < lastScroll - 4 || scroll < window.innerHeight * 0.8) nav.classList.remove('is-hidden');
  lastScroll = scroll;
}

// ───────────────────────────────────────── pointer, cursor, magnetic buttons
const pointer = { x: 0, y: 0, cx: -100, cy: -100, rx: -100, ry: -100 };
window.addEventListener('pointermove', (e) => {
  pointer.cx = e.clientX; pointer.cy = e.clientY;
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
  exp?.setPointer(pointer.x, pointer.y);
}, { passive: true });

const cursor = $('.cursor');
const cDot = $('.cursor__dot');
const cRing = $('.cursor__ring');
if (finePointer && !reduced) {
  document.documentElement.classList.add('has-cursor');
  document.addEventListener('pointerover', (e) => {
    cursor.classList.toggle('is-hover', !!e.target.closest('a, button, input, textarea, .notes__frame'));
  });
  $$('.btn').forEach((b) => {
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * 0.18, y: (e.clientY - r.top - r.height / 2) * 0.3, duration: 0.5, ease: 'power3.out' });
    });
    b.addEventListener('pointerleave', () => gsap.to(b, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.4)' }));
  });
}
function updateCursor() {
  pointer.rx = lerp(pointer.rx, pointer.cx, 0.16);
  pointer.ry = lerp(pointer.ry, pointer.cy, 0.16);
  cDot.style.transform = `translate(${pointer.cx}px, ${pointer.cy}px) translate(-50%, -50%)`;
  cRing.style.transform = `translate(${pointer.rx}px, ${pointer.ry}px) translate(-50%, -50%)`;
}

// ───────────────────────────────────────── language switch
$$('[data-lang]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
onLangChange(() => {
  applyLinks();
  splitNotes();
  showNote(Math.max(0, activeNote), -1, true);
  const msg = $('.form textarea');
  if (msg.dataset.prefilled === '1') msg.value = t('order.prefill');
  ScrollTrigger.refresh();
});

// ───────────────────────────────────────── order → contact form
$$('.js-order').forEach((a) => a.addEventListener('click', () => {
  const msg = $('.form textarea');
  if (!msg.value.trim() || msg.dataset.prefilled === '1') {
    msg.value = t('order.prefill');
    msg.dataset.prefilled = '1';
  }
  setTimeout(() => $('.form input[name="name"]').focus({ preventScroll: true }), 1800);
}));
$('.form textarea').addEventListener('input', (e) => { e.target.dataset.prefilled = '0'; });

// ───────────────────────────────────────── contact form
const form = $('.form');
const status = $('.form__status');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = form.elements;
  if (f._honey.value) return;
  const data = { name: f.name.value.trim(), email: f.email.value.trim(), message: f.message.value.trim() };
  let ok = true;
  $$('.field', form).forEach((el) => el.classList.remove('is-invalid'));
  if (!data.name) { f.name.closest('.field').classList.add('is-invalid'); ok = false; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) { f.email.closest('.field').classList.add('is-invalid'); ok = false; }
  if (!data.message) { f.message.closest('.field').classList.add('is-invalid'); ok = false; }
  if (!ok) return;

  const btn = $('.form__submit span');
  status.classList.remove('is-error');
  const mailto = () => {
    const body = `${data.message}\n\n— ${data.name} (${data.email})`;
    window.location.href = `mailto:${CONFIG.email}?subject=${encodeURIComponent('LONDUVE — ' + data.name)}&body=${encodeURIComponent(body)}`;
  };

  if (isPlaceholderEmail()) {
    console.warn('[londuve] Set CONFIG.email in src/config.js to receive form messages.');
    mailto();
    status.textContent = t('form.mailto');
    return;
  }
  btn.textContent = t('form.sending');
  try {
    const res = await fetch(CONFIG.formEndpoint(CONFIG.email), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        ...data,
        _subject: `LONDUVE website — message from ${data.name}`,
        _template: 'table',
        _captcha: 'false',
        _replyto: data.email,
        language: document.documentElement.lang,
      }),
    });
    if (!res.ok) throw new Error(String(res.status));
    status.textContent = t('form.ok');
    form.reset();
  } catch (err) {
    status.textContent = t('form.err');
    status.classList.add('is-error');
  } finally {
    btn.textContent = t('form.send');
  }
});

// ───────────────────────────────────────── main loop
function frame(time) {
  if (lenis) lenis.raf(time * 1000);
  const scroll = lenis ? lenis.scroll : window.scrollY;
  const vel = lenis ? clamp(lenis.velocity / 40, -3, 3) : 0;
  onScroll(scroll);
  if (exp) {
    exp.setTarget(poseAt(scroll));
    exp.setScroll(scroll / window.innerHeight, vel);
    exp.render();
    updateCallouts();
  }
  if (gallery) { gallery.setVelocity(vel); gallery.render(); }
  if (finePointer) updateCursor();
}

// ───────────────────────────────────────── boot
function intro() {
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.to('.loader__mark, .loader__meta, .loader__bar', { opacity: 0, y: -16, duration: 0.6, stagger: 0.05, ease: 'power2.in' })
    .to('.loader', { clipPath: 'inset(0 0 100% 0)', duration: 1.2, ease: 'expo.inOut' }, '-=0.15')
    .add(() => {
      document.body.classList.remove('is-loading');
      lenis?.start();
      ScrollTrigger.refresh();
      gsap.ticker.remove(loaderTick);
    }, '-=0.6')
    .fromTo('.hero__eyebrow', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1.2 }, '-=0.5')
    .fromTo('.hero .wordmark', { clipPath: 'inset(0 50% 0 50%)', opacity: 0, filter: 'blur(14px)', scale: 1.06 },
      { clipPath: 'inset(0 0% 0 0%)', opacity: 1, filter: 'blur(0px)', scale: 1, duration: 2, ease: 'expo.inOut' }, '<')
    .fromTo('.hero__claim > *', { opacity: 0, y: 12 }, { opacity: 1, y: 0, stagger: 0.07, duration: 1 }, '-=0.9')
    .fromTo('.nav', { yPercent: -100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.2 }, '-=1')
    .fromTo('.hud, .scroll-cue, .hero__side', { opacity: 0 }, { opacity: 1, duration: 1.2, clearProps: 'opacity' }, '<')
    .add(() => loaderEl.remove());
}

(async function boot() {
  gsap.ticker.add(frame);
  let noteImgs = [];
  try {
    noteImgs = await preload();
  } catch (e) {
    console.warn('[londuve] preload issue', e);
  }
  if (exp && noteImgs.length === NOTE_IMAGES.length) {
    try { gallery = new NotesGallery($('.notes__canvas'), noteImgs); } catch (e) { console.warn(e); }
  }
  if (!gallery) document.documentElement.classList.add('no-webgl-notes');
  buildScrollAnimations();
  ScrollTrigger.addEventListener('refresh', buildKeys);
  ScrollTrigger.refresh();
  buildKeys();
  intro();
})();

let resizeTimer;
let lastSize = { w: window.innerWidth, h: window.innerHeight };
window.addEventListener('resize', () => {
  exp?.resize();
  // ignore the small height changes caused by mobile address bars
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (w === lastSize.w && Math.abs(h - lastSize.h) < 160) return;
  lastSize = { w, h };
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { ScrollTrigger.refresh(); buildKeys(); }, 150);
});

// debug helpers for QA (harmless in production)
window.__londuve = { scrollTo, get exp() { return exp; }, get lenis() { return lenis; }, get gallery() { return gallery; } };
