import type { ReadingCatalogue } from './contracts.ts';
import validateCatalogue from './generated/reading-catalogue.js';

// Bundled catalogue for standalone use and the site's offline fallback.
// Hindi titles are editable copy; review them with the studio before launch.
export const services = [
  {
    id: 'tarot',
    type: 'tarot',
    title: 'Tarot Reading',
    hindiTitle: 'टैरो रीडिंग',
    price: null,
    contactDestination: 'studio',
    practitioner: { name: 'Amanpreet Kaur' },
    description:
      'Explore relationships, work and the questions on your mind in a personal tarot reading.',
    features: [
      'Personal conversation',
      'Discuss your questions with the reader',
    ],
  },
  {
    id: 'birhaat',
    type: 'astrology',
    title: 'Birhaat Kundli',
    hindiTitle: 'बृहत् कुंडली',
    price: 699,
    contactDestination: 'studio',
    description:
      'A thoughtful introduction to your chart, personal strengths, and the questions on your mind.',
    features: [
      'Personality & core themes',
      'Career & relationship perspectives',
      'Personalised PDF report',
    ],
  },
  {
    id: 'bhrigu',
    type: 'astrology',
    title: 'Bhrigu Patrika',
    hindiTitle: 'भृगु पत्रिका',
    price: 999,
    contactDestination: 'studio',
    description:
      'Explore recurring themes and life transitions through a traditional Vedic reading.',
    features: [
      'Everything in Birhaat Kundli',
      'Life patterns & transitions',
      'Traditional remedy suggestions',
    ],
  },
  {
    id: 'parashara',
    type: 'astrology',
    title: 'Parashara Patrika Plus',
    hindiTitle: 'पराशर पत्रिका प्लस',
    price: 1499,
    contactDestination: 'studio',
    description:
      'An extended interpretation for those who want more time and space to explore their chart.',
    features: [
      'Detailed chart interpretation',
      'Dashas & transit discussion',
      'Comprehensive PDF report',
    ],
  },
] satisfies ReadingCatalogue;

export function isReadingCatalog(value: unknown): value is ReadingCatalogue {
  if (!validateCatalogue(value)) return false;
  const catalogue = value as ReadingCatalogue;
  return (
    new Set(catalogue.map((reading) => reading.id)).size === catalogue.length
  );
}
