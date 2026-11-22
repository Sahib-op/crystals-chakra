import { CONTACT_DESTINATIONS } from './studio.js';
const PHONE = /^[1-9]\d{6,14}$/;
const MAX_MESSAGE_LENGTH = 600;
export const MAX_READING_QUESTION_LENGTH = 400;

function destination(key = 'studio') {
  if (!Object.hasOwn(CONTACT_DESTINATIONS, key))
    throw new RangeError('Unknown studio contact destination.');
  const configured = CONTACT_DESTINATIONS[key];
  if (!PHONE.test(configured.whatsapp) || !PHONE.test(configured.telephone))
    throw new Error('Studio telephone numbers must use international digits.');
  return configured;
}

function plainText(value, limit) {
  if (typeof value !== 'string') return '';
  return Array.from(
    value
      .normalize('NFC')
      .replace(/[\ud800-\udfff]/gu, '\ufffd')
      .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  )
    .slice(0, limit)
    .join('');
}

/** Accept plain text, not pre-encoded text; encode it exactly once here. */
export function whatsappHref(message = '', key = 'studio') {
  const { whatsapp } = destination(key);
  const text = plainText(message, MAX_MESSAGE_LENGTH);
  return `https://wa.me/${whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
export function telephoneHref(key = 'studio') {
  return `tel:+${destination(key).telephone}`;
}
export function readingMessage(reading, question = '') {
  const title = plainText(reading?.title, 100);
  if (!title) {
    const message =
      "Hi, I'd like to discuss a tarot or astrology reading. Could you help me choose?";
    const note = plainText(question, MAX_READING_QUESTION_LENGTH);
    return note ? `${message} My question: ${note}` : message;
  }
  const practitioner = plainText(reading?.practitioner?.name, 80);
  return `Hi, I'd like to ask about ${title}${practitioner ? ` with ${practitioner}` : ''}. Please let me know the price and available timings.`;
}
export function readingContact(reading, question = '') {
  // A catalogue response cannot replace the business's approved destination.
  const key = Object.hasOwn(CONTACT_DESTINATIONS, reading?.contactDestination)
    ? reading.contactDestination
    : 'studio';
  const configured = destination(key);
  const message = readingMessage(reading, question);
  return {
    message,
    whatsapp: whatsappHref(message, key),
    telephone: telephoneHref(key),
    displayNumber: configured.display,
    copyNumber: `+${configured.telephone}`,
  };
}
export function productEnquiryHref(product) {
  const title = plainText(product?.title, 120);
  return whatsappHref(
    title
      ? `Hi, I'd like to enquire about ${title}.`
      : "Hi, I'd like to ask about the crystal collection.",
  );
}
