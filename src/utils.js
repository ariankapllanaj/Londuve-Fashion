export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => [...root.querySelectorAll(s)];
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const range = (v, a, b) => clamp((v - a) / (b - a));

/** Wrap every character of an element's text in spans (keeps words together). */
export function splitChars(el) {
  const text = el.dataset.splitSource ?? el.textContent;
  el.dataset.splitSource = text;
  el.setAttribute('aria-label', text);
  el.textContent = '';
  const chars = [];
  text.split(/(\s+)/).forEach((part) => {
    if (!part) return;
    if (/^\s+$/.test(part)) { el.appendChild(document.createTextNode(' ')); return; }
    const w = document.createElement('span');
    w.className = 'split-word';
    w.setAttribute('aria-hidden', 'true');
    for (const ch of part) {
      const c = document.createElement('span');
      c.className = 'split-char';
      c.textContent = ch;
      w.appendChild(c);
      chars.push(c);
    }
    el.appendChild(w);
  });
  return chars;
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch (e) {
    return false;
  }
}
