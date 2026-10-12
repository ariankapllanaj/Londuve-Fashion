# LONDUVE — N°01 COURAGE

One-page website for **LONDUVE Fragrance** — *No label, just legacy.*
Three.js + GSAP + Lenis, built with Vite 6. The 3D bottle is modelled in Blender.

## Run it

Needs Node.js 18 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production files → dist/
npm run preview    # serve dist/ locally
```

`dist/` is already built and can be uploaded as-is to any static host
(Netlify drag-and-drop, Vercel, Cloudflare Pages, or the `public_html` folder of normal hosting).
Open it through a web server, not by double-clicking `index.html` (browsers block loading the 3D model from `file://`).

## Deploy (GitHub Pages)

Every push to `main` builds and publishes the site with `.github/workflows/deploy.yml`
(Node 20, `npm ci && npm run build`, uploads `dist/`).
The site is served from `https://<username>.github.io/<repo-name>/`; the workflow passes that
sub-path to Vite as `BASE_PATH`, so asset URLs work whatever the repo is called.
One-time setup in GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Before going live — `src/config.js`

| Setting | What it does |
|---|---|
| `email` | Where contact-form messages go, also shown as the email link. **Currently a placeholder.** |
| `whatsapp` | Number in international format, digits only (e.g. `41791234567`). **Placeholder.** |
| `instagram` | Handle without `@`. Set to `londuve` — confirm it's the client's account. |

The contact form uses [FormSubmit](https://formsubmit.co) (free, no backend). The **first** message sent
after you set the real email triggers an activation email to that inbox — click the link once and every
later message is delivered. While the email is still the placeholder, the form opens the visitor's mail app instead.

After editing, run `npm run build` again and re-upload `dist/`.

## Page structure

1. **Hero** — wordmark *NO LABEL, LONDUVE, JUST LEGACY* (website slogan) with a light sheen.
2. **Emblem** — the LONDUVE Fragrance monogram opens the perfume part, then hands over to the 3D bottle.
3. **Courage** — the Blender bottle rises, fills with perfume, rotates; *WEAR COURAGE, LEAVE LEGACY*; HUD callouts.
4. **Extrait** — the *42% Oil Concentration · Extrait de Parfum* moment: counter fills with liquid + concentration scale.
5. **Notes** — Top: Nutmeg · Heart: Rose, Lily, Jasmine · Base: Vanilla, Salted Caramel.
   Each photo is replaced by the next with a WebGL shader transition (molten-gold front, RGB split) as you scroll.
6. **Order** — campaign photo, specs, **CHF 75.95 · 50 ml**, Order now (pre-fills the contact form) and Order via WhatsApp.
7. **Contact** — form + WhatsApp, Instagram, Email.

Languages: **EN / DE / FR** (switcher in the header; auto-detects the browser language, `?lang=de` forces one).
German uses Swiss spelling (ss, no ß). Slogans stay in English in every language. All copy lives in `src/i18n.js`.

## Files

```
index.html               page markup
src/main.js              scroll choreography, loader, language, form
src/scene/Experience.js  3D stage: bottle materials, sparkles, halo rings, bloom/post-processing
src/scene/NotesGallery.js + shaders.js   notes transition shader and all GLSL
src/styles/main.css      design (colors/fonts as CSS variables at the top)
public/models/courage.glb   web 3D bottle (exported from Blender)
public/img/               logos (transparent PNG), note photos, campaign photo
blender/                  Blender source of the bottle
```

## The 3D bottle (Blender)

- `blender/courage_bottle.blend` — full studio scene (bottle, black marble pedestal, lights, camera) for Cycles renders.
- `blender/courage_render.png` — Cycles render of the model.
- `blender/build_bottle.py` — the procedural model. Re-run it to rebuild the bottle and re-export the web model:

```bash
blender -b -P blender/build_bottle.py            # writes public/models/courage.glb + the .blend
COURAGE_RENDER=1 blender -b -P blender/build_bottle.py   # also renders courage_render.png
```

If you edit the bottle by hand in Blender, export with **File → Export → glTF 2.0 (.glb)** to `public/models/courage.glb`
(selected objects, +Y up) and keep the object names `Glass`, `Liquid`, `Cap`, `Collar`, `Tube`, `Label` — the site uses them.
The label artwork is `public/models/label.png` (monogram + COURAGE, made from the logo).

## Notes

- Smooth scrolling and heavy effects switch off for visitors with *Reduce motion* enabled.
- Without WebGL the site still works with the photos (3D and shader parts are skipped).
- Fonts are self-hosted (Cormorant Garamond, Cinzel, Manrope, IBM Plex Mono — all open-source).
