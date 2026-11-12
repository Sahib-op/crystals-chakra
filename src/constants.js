import { CONTACT_DESTINATIONS, STUDIO } from '../shared/studio.js';
// Public compatibility exports; business configuration lives in one place.
export const BRAND_NAME = STUDIO.name;
export const BRAND_TAGLINE = STUDIO.tagline;
export const SUPPORT_EMAIL = STUDIO.supportEmail;
export const WHATSAPP_NUMBER = CONTACT_DESTINATIONS.studio.whatsapp;
export const WHATSAPP_DISPLAY = CONTACT_DESTINATIONS.studio.display;
export const SITE_URL = STUDIO.siteUrl;

// ─── SEO Defaults ───
export const DEFAULT_TITLE = `${BRAND_NAME} — ${BRAND_TAGLINE}`;
export const DEFAULT_DESCRIPTION =
  'Personal tarot and Vedic astrology readings. Speak directly with the Crystals Chakra studio on WhatsApp or by phone, and explore the crystal collection.';
export const DEFAULT_OG_IMAGE = '/og-image.png';
