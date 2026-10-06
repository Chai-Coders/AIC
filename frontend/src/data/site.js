// Site-wide constants: links, contact details and external forms.

export const APPLY_URL = 'https://forms.gle/2c4NgmXp4B16zGet6';
export const RECOGNITION_FORM_URL = 'https://goo.gl/forms/5BGUvajn6IoUryqF3';
export const REGISTER_URL = 'https://goo.gl/forms/bYQ16uftJgLtssgr2';
export const SIA_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLScMg2bbHeF0wbV_feQlbAcHz1ro78PdpYNEwKni870ZSvl4mg/viewform';
export const SISFS_URL = 'https://seedfund.startupindia.gov.in/';
export const HOST_INSTITUTE_URL = 'http://www.iiitkottayam.ac.in/';

export const CONTACT = {
  address: ['Building no. 340,', 'Karoor Valavoor P.O.,', 'Kottayam, Kerala 686635.'],
  emails: ['incubate@iiitkottayam.ac.in', 'ceo-aic@iiikottayam.ac.in'],
  phones: ['+91-482-2202156', '+91-482-2202155', '+91-9400063494', '+91-9443543746'],
  // Google Maps search for the campus: `mapUrl` opens it, `mapEmbedUrl` is shown in the footer.
  mapUrl: 'https://maps.google.com/?q=IIIT+Kottayam+Valavoor',
  mapEmbedUrl: 'https://maps.google.com/maps?q=IIIT+Kottayam+Valavoor&output=embed',
};

// `text` is used instead of `icon` where Font Awesome 4.7 has no glyph (X).
export const SOCIAL = [
  { label: 'Facebook', icon: 'fa-facebook', href: 'https://www.facebook.com/aiciiitkottayam/' },
  { label: 'X', text: 'X', href: 'https://twitter.com/AICIIITKottayam' },
  { label: 'LinkedIn', icon: 'fa-linkedin', href: 'https://www.linkedin.com/company/aic-iiitkottayam' },
  { label: 'YouTube', icon: 'fa-youtube-play', href: 'https://www.youtube.com/' },
  { label: 'Instagram', icon: 'fa-instagram', href: 'https://www.instagram.com/aic.iiitkottayam/' },
];

export const telHref = (phone) => `tel:${phone.replace(/[^+\d]/g, '')}`;
