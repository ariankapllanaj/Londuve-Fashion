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

## Deploy (Hostpoint or any classic web hosting)

1. `npm run build` (without `BASE_PATH`, so paths start at the domain root).
2. In the Hostpoint Control Panel, add the domain as a website and turn on SSL for it.
3. Upload **the contents of `dist/`** (not the folder itself) into the website's document root,
   e.g. `www/<domain>/`, with an SFTP/FTP client (FileZilla, Cyberduck). Include the hidden `.htaccess`.
4. Open `https://<domain>/` and check the 3D bottle, images and fonts load.

`public/.htaccess` (copied into `dist/`) forces HTTPS, sets the file types for the 3D model and fonts,
and adds caching. If the host ever shows *500 Internal Server Error*, delete `.htaccess`.
After moving to the domain: point the Stripe success URL to `https://<domain>/?paid=1` and set the
`og:image` meta tag in `index.html` to the full `https://<domain>/og-image.jpg`.

## Before going live — `src/config.js`

| Setting | What it does |
|---|---|
| `email` | Where contact-form messages go, also shown as the email link: `londuve@gmx.ch`. |
| `whatsapp` | List of WhatsApp numbers as they should appear (e.g. `'+41 79 447 74 73'`). All are listed under Contact; the **first** one is used by *Order via WhatsApp*. |
| `instagram` | Handle without `@`. Set to `londuve` — confirm it's the client's account. |
| `product` | Name, volume and **price (CHF 79.95)** — the one place to change them; the page and all three languages read from here. |
| `checkoutUrl` | The client's hosted payment link (Stripe Payment Link / Payrexx …). **Empty for now** — see *Payments* below. |
| `checkoutLocaleParam` | `'locale'` for Stripe (opens the payment page in EN/DE/FR). Set `''` for providers without it. |
| `paidParam` | `'paid'` — the checkout's success URL returns to `…/?paid=1` to show the thank-you banner. |
| `paymentMethods` | Methods listed under the price once payment is live. List only what is really enabled. |
| `legal` | URLs of the Imprint, Terms, Privacy and Shipping & Returns pages. Empty = placeholder page `public/legal.html`. |

The contact form uses [FormSubmit](https://formsubmit.co) (free, no backend). The **first** message sent
after you set the real email triggers an activation email to that inbox — click the link once and every
later message is delivered. While the email is still the placeholder, the form opens the visitor's mail app instead.

After editing, run `npm run build` again and re-upload `dist/`.

## Payments (TWINT + card) — no server needed

The site stays static: **Order now** opens a *hosted checkout link* from the **client's own** payment
account, so the money is paid out to the client's bank account, never to the developer's.
Default: a **Stripe Payment Link** in CHF with TWINT, cards and Apple Pay / Google Pay.
To switch to Payrexx (or another Swiss provider) later, replace the one URL in `CONFIG.checkoutUrl`
(and set `checkoutLocaleParam` to `''` if that provider has no language parameter).

How it behaves:

- `checkoutUrl` **empty** → *Order now* scrolls to the contact form with a pre-filled order message,
  the note says orders are confirmed by message, and the payment-method line is hidden. Nothing breaks.
- `checkoutUrl` **set** → *Order now* opens the payment page in the same tab, in the visitor's language
  (`?locale=en|de|fr`), shows "Pay with TWINT · Visa · …" under the price and a secure-payment note.
- After paying, the checkout sends the customer to `…/?paid=1` → a thank-you banner
  ("Your order is confirmed. Delivery takes 10–16 days.") and the address bar is cleaned.
  `?paid=1` is only a courtesy message — anyone can type it. The real confirmation is the
  payment in the Stripe/Payrexx dashboard and its email receipt.
- *Order via WhatsApp* stays as a second option.

Never put a **secret key** (`sk_…`), password or IBAN anywhere in this repo — `src/config.js` is public.
A payment link or a publishable key (`pk_…`) is fine.

TWINT logo: the payment line shows names as text. To use logos, put the **official** files supplied by
the client in `public/img/payment/` (e.g. `twint.svg`, used according to TWINT's brand guidelines —
never redrawn) and set `logo: 'img/payment/twint.svg'` in `CONFIG.paymentMethods`.

### Client setup checklist

- [ ] Create a **Stripe** account (or **Payrexx**) in the business's / client's name, with the client's **Swiss IBAN** as the payout account.
- [ ] Enable **TWINT**, **cards**, and **Apple Pay / Google Pay**, in **CHF**.
      Stripe only activates TWINT once its requirements are met (they can change — check
      [docs.stripe.com/payments/twint](https://docs.stripe.com/payments/twint)): a reachable website that isn't
      password-protected or "coming soon"; a legal notice / terms showing the **company name and legal form,
      full business address and an email or phone number**; **Switzerland as a shipping destination**; prices in **CHF**.
      → fill in the Imprint and the other legal pages **before** requesting TWINT.
- [ ] Create the product **"N°01 COURAGE – Extrait de Parfum 50 ml"**, **CHF 79.95**, and a Payment Link with **adjustable quantity**.
- [ ] In the Payment Link options: **collect the shipping address** and **require a phone number**; limit shipping
      to the countries the client actually delivers to (Switzerland must be one of them for TWINT).
- [ ] *After payment* → **redirect to your website**: the site address + `?paid=1`
      (e.g. `https://ariankapllanaj.github.io/Londuve-Fashion/?paid=1`, or the client's own domain later).
- [ ] Optional: in Stripe's Public details, add the Terms and Privacy URLs so the checkout links to them.
- [ ] Paste the link into `CONFIG.checkoutUrl`, push, and do a **test payment in test mode** before going live
      (test link `https://buy.stripe.com/test_…`), then swap in the live link.
- [ ] Check **fees**, the **VAT position**, and **carrier restrictions for shipping perfume** (it's flammable) before selling.
- [ ] Supply the texts for **Imprint, Terms, Privacy, Shipping & Returns** (lawyer / fiduciary), then set the URLs in `CONFIG.legal`
      (or replace the placeholders in `public/legal.html` and remove its `noindex` tag).
- [ ] Supply the official **TWINT logo** files if logos should replace the text.

## Page structure

1. **Hero** — wordmark *NO LABEL, LONDUVE, JUST LEGACY* (website slogan) with a light sheen.
2. **Emblem** — the LONDUVE Fragrance monogram opens the perfume part, then hands over to the 3D bottle.
3. **Courage** — the Blender bottle rises, fills with perfume, rotates; *WEAR COURAGE, LEAVE LEGACY*; HUD callouts.
4. **Extrait** — the *42% Oil Concentration · Extrait de Parfum* moment: counter fills with liquid + concentration scale.
5. **Notes** — Top: White Musk · Heart: Rose, Lily, Jasmine · Base: Vanilla, Salted Caramel.
   All four notes are shown side by side in one screen (2 × 2 on phones). As the section scrolls in, each photo is
   revealed inside its arch by a WebGL shader (molten-gold front, RGB split, scan-lines), left to right: Top → Heart → Base.
   On desktop, hovering a note adds a ripple/zoom and dims the others. The top-note photo (`public/img/note-nutmeg.webp`)
   is still the old nutmeg image — replace it with a White Musk photo (same name, portrait ~940 × 1670) when the client sends one.
6. **Order** — campaign photo, specs, price, delivery timeline (10–16 days), **Order now** (opens the payment link when `checkoutUrl` is set, otherwise pre-fills the contact form) and Order via WhatsApp.
7. **Contact** — form + WhatsApp, Instagram, Email.

Languages: **EN / DE / FR** (switcher in the header; auto-detects the browser language, `?lang=de` forces one).
German uses Swiss spelling (ss, no ß). Slogans stay in English in every language. All copy lives in `src/i18n.js`.

## Files

```
index.html               page markup
src/main.js              scroll choreography, loader, language, form
src/scene/Experience.js  3D stage: bottle materials, sparkles, halo rings, bloom/post-processing
src/scene/NotesGallery.js + shaders.js   notes reveal shader (one canvas for all four arches) and all GLSL
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
