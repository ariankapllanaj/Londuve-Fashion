/**
 * ─────────────────────────────────────────────────────────────
 *  LONDUVE — site settings
 *  Edit the values below; everything on the site updates from here.
 *  This file is PUBLIC (it ships to every visitor): never put a secret key,
 *  password or IBAN in it. Payment links and publishable keys are fine.
 * ─────────────────────────────────────────────────────────────
 */
export const CONFIG = {
  /** Where contact-form messages are delivered (also shown as the email link). */
  email: 'londuve@gmx.ch',

  /**
   * WhatsApp numbers, written exactly as they should appear on the site (international format).
   * All of them are listed in the contact section; the FIRST one is used by the
   * "Order via WhatsApp" button (with the pre-filled order message).
   */
  whatsapp: ['+41 79 447 74 73', '+41 79 442 72 77'],

  /** Instagram handle without the @. */
  instagram: 'londuve',

  /**
   * Form delivery endpoint. FormSubmit forwards submissions to `email`
   * (the first submission sends an activation email to that inbox — click it once).
   * Leave as is unless you switch to another provider (Web3Forms, Formspree…).
   */
  formEndpoint: (email) => `https://formsubmit.co/ajax/${encodeURIComponent(email)}`,

  /** The product — single source of truth for the price and volume shown on the site. */
  product: {
    name: 'COURAGE',
    number: 'N°01',
    volumeMl: 50,
    price: 79.95,
    currency: 'CHF',
    concentration: 42,
  },

  /**
   * ── PAYMENT ────────────────────────────────────────────────
   * Hosted checkout link from the CLIENT's own payment account
   * (Stripe Payment Link, Payrexx Paylink, …). The money goes to whoever owns that account.
   * Paste the full link here, e.g. 'https://buy.stripe.com/xxxxxxxxxxxx'.
   * While this is empty, "Order now" scrolls to the contact form with a pre-filled
   * order message instead, and the payment-method line stays hidden.
   */
  checkoutUrl: '',

  /**
   * URL parameter the checkout uses for its language. Stripe Payment Links: 'locale'
   * (the site appends ?locale=en|de|fr). Set to '' if your provider doesn't support it.
   */
  checkoutLocaleParam: 'locale',

  /**
   * The checkout's success / redirect URL must point back to the site with this
   * parameter set to 1, e.g. https://<site>/?paid=1 — the site then shows the thank-you banner.
   */
  paidParam: 'paid',

  /**
   * Payment methods listed under the price (only shown once checkoutUrl is set).
   * List only what is actually enabled in the payment account.
   * `logo`: optional path inside public/ to an OFFICIAL logo file supplied by the client,
   * e.g. 'img/payment/twint.svg'. Never redraw a brand logo; leave '' to show the name as text.
   */
  paymentMethods: [
    { name: 'TWINT', logo: '' }, // ← TWINT LOGO PLACEHOLDER: official asset from the client, used per TWINT's brand guidelines
    { name: 'Visa', logo: '' },
    { name: 'Mastercard', logo: '' },
    { name: 'Apple Pay', logo: '' },
    { name: 'Google Pay', logo: '' },
  ],

  /**
   * Legal pages (footer links). Paste the URL of each page once the client supplies the text.
   * While empty, the links open the placeholder page public/legal.html.
   */
  legal: {
    imprint: '',
    terms: '',
    privacy: '',
    shipping: '',
  },
};

export const formatPrice = (p = CONFIG.product) => `${p.currency} ${p.price.toFixed(2)}`;
export const formatVolume = (p = CONFIG.product) => `${p.volumeMl} ml`;
export const hasCheckout = () => /^https:\/\/\S+$/i.test((CONFIG.checkoutUrl || '').trim());
/** WhatsApp numbers as a clean list (accepts a single string too). */
export const whatsappNumbers = () => [].concat(CONFIG.whatsapp || []).map((n) => String(n).trim()).filter(Boolean);
/** wa.me chat link for a number (digits only), optionally with a pre-filled message. */
export const whatsappLink = (number, text = '') =>
  `https://wa.me/${number.replace(/\D/g, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
export const isPlaceholderEmail = (e = CONFIG.email) => /example\.com$/i.test(e);
