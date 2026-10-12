/**
 * ─────────────────────────────────────────────────────────────
 *  LONDUVE — site settings
 *  Edit the values below; everything on the site updates from here.
 * ─────────────────────────────────────────────────────────────
 */
export const CONFIG = {
  /** Where contact-form messages are delivered (also shown as the email link). */
  email: 'your-email@example.com',

  /** WhatsApp number in international format, digits only (e.g. 41791234567). */
  whatsapp: '41000000000',

  /** Instagram handle without the @. */
  instagram: 'londuve',

  /**
   * Form delivery endpoint. FormSubmit forwards submissions to `email`
   * (the first submission sends an activation email to that inbox — click it once).
   * Leave as is unless you switch to another provider (Web3Forms, Formspree…).
   */
  formEndpoint: (email) => `https://formsubmit.co/ajax/${encodeURIComponent(email)}`,

  product: {
    name: 'COURAGE',
    number: 'N°01',
    volume: '50 ml',
    price: 'CHF 75.95',
    concentration: 42,
  },
};

export const isPlaceholderEmail = (e = CONFIG.email) => /example\.com$/i.test(e);
