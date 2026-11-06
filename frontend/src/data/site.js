// Site-wide constants. The addresses people go to are editable (links.* in
// src/content/registry.js).

// The address, emails and phone numbers are editable texts (contact.* in
// src/content/registry.js). MAP_EMBED_URL is the map in the contact section.
export const MAP_EMBED_URL = 'https://maps.google.com/maps?q=AIC-IIITKottayam&ll=9.7449549,76.6464343&z=17&output=embed';

// `text` is used instead of `icon` where Font Awesome 4.7 has no glyph (X).
// `brand` keys the hover colour in site-footer__social CSS to each platform's own brand colour.
export const SOCIAL = [
  { label: 'Facebook', icon: 'fa-facebook', brand: 'facebook' },
  { label: 'X', text: 'X', brand: 'x' },
  { label: 'LinkedIn', icon: 'fa-linkedin', brand: 'linkedin' },
  { label: 'YouTube', icon: 'fa-youtube-play', brand: 'youtube' },
  { label: 'Instagram', icon: 'fa-instagram', brand: 'instagram' },
];

export const telHref = (phone) => `tel:${phone.replace(/[^+\d]/g, '')}`;
