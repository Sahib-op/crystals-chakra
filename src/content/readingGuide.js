// Reader-facing reference content shared by About Astrology & Tarot (home)
// and the reading guide page (/how-readings-work). Plain language, no promised
// outcomes. Anything only the studio can confirm (prices, timings, payment,
// cancellation) comes from shared/business.js and the catalogue instead.
import { SYMBOLS } from '../components/celestial/symbols';

export const CARD_MEANINGS = SYMBOLS;

// `readings` link each term back to the readings where it comes up.
export const KEY_TERMS = [
  {
    id: 'kundli',
    term: 'Kundli (birth chart)',
    text: 'A map of where the Sun, Moon and planets were at the date, time and place of your birth. It is calculated first; interpreting it is the reading.',
    readings: ['birhaat', 'bhrigu', 'parashara'],
  },
  {
    id: 'lagna',
    term: 'Lagna (ascendant)',
    text: 'The sign rising on the eastern horizon at your birth. It sets the starting point of the twelve houses, which is why the birth time matters.',
    readings: ['birhaat', 'parashara'],
  },
  {
    id: 'house',
    term: 'Houses',
    text: 'Twelve divisions of the chart, each associated with an area of life such as work, home or relationships.',
    readings: ['birhaat', 'parashara'],
  },
  {
    id: 'nakshatra',
    term: 'Nakshatra',
    text: 'One of 27 lunar mansions in Vedic astrology. The Moon’s nakshatra at birth is often discussed in a reading.',
    readings: ['bhrigu', 'parashara'],
  },
  {
    id: 'dasha',
    term: 'Dasha',
    text: 'A planetary period. Vedic astrology divides life into periods ruled by different planets and reads their themes in turn.',
    readings: ['parashara'],
  },
  {
    id: 'transit',
    term: 'Transit (gochar)',
    text: 'Where the planets are now, compared with your birth chart. Transits are used to talk about the present period.',
    readings: ['parashara'],
  },
  {
    id: 'remedy',
    term: 'Remedy (upaay)',
    text: 'A traditional practice suggested in some readings, such as a prayer or a habit. It is offered as tradition, not as a guaranteed fix.',
    readings: ['bhrigu'],
  },
  {
    id: 'spread',
    term: 'Spread',
    text: 'The layout of tarot cards in a reading. Each position has a meaning, such as the situation, the challenge or the advice.',
    readings: ['tarot'],
  },
  {
    id: 'major-arcana',
    term: 'Major Arcana',
    text: 'The 22 named tarot cards, such as The Star or The Moon, associated with bigger themes. The other 56 cards are the Minor Arcana.',
    readings: ['tarot'],
  },
];

// `short: true` questions also appear on the home page.
export const QUESTIONS = [
  {
    q: 'Does contacting you book a reading?',
    a: 'No. Opening WhatsApp or calling starts a conversation. Your reading is booked only once the studio confirms the date, time, price and how to pay.',
    short: true,
  },
  {
    q: 'What birth details will you need?',
    a: 'For a Kundli reading: your date, time and place of birth. The studio asks for these in the conversation; you never enter them on this website. A tarot reading needs no birth details.',
    short: true,
  },
  {
    q: 'I have never had a reading. Where do I start?',
    a: 'Choose “I’m not sure yet” in the booking panel and tell the studio what is on your mind. They will suggest tarot or a Kundli reading and explain what it involves.',
    short: true,
  },
  {
    q: 'Is the free cosmic reading a full Kundli?',
    a: 'No. It uses only your date of birth for a conventional zodiac sign and a numerology number, calculated in your browser. A Kundli needs your birth time and place and a personal interpretation.',
    short: true,
  },
  {
    q: 'What is the difference between tarot and a Kundli reading?',
    a: 'Tarot uses cards drawn for your question and works well for what is happening now. A Kundli reading interprets your birth chart and looks at longer patterns and periods.',
  },
  {
    q: 'How should I prepare?',
    a: 'Write down one to three questions you care about. For a Kundli, check your birth time if you can; a birth certificate or a family member may know it.',
  },
  {
    q: 'What if I do not know my exact birth time?',
    a: 'Tell the studio. An approximate time still allows a reading, though some details, such as the ascendant, become less certain.',
  },
  {
    q: 'Will a reading predict exactly what will happen?',
    a: 'No reading can guarantee an outcome. Tarot and astrology are offered for reflection and guidance; your choices stay yours.',
  },
  {
    q: 'Can a reading replace medical, legal or financial advice?',
    a: 'No. For health, legal, financial or mental-health concerns, please speak to a qualified professional.',
  },
  {
    q: 'How is my information handled?',
    a: 'This website does not collect your details. The studio receives only what you send on WhatsApp or say on the phone, and uses it to arrange and give your reading.',
  },
];

// Shown over the zodiac ring beside the About Astrology title.
export const PROOF_NOTE = {
  title: 'Precision is not the same as proof.',
  text: 'Astrology is a cultural and spiritual practice. Its claims about personality and future events are not established scientific predictions. A chart’s calculations and the meaning people find in it are different things.',
};

// What a full (Kundli) reading needs. Shown in Hinglish with the Devanagari
// beside it; `en` is read to screen readers only.
export const BIRTH_DETAILS = [
  {
    id: 'date',
    hinglish: 'Janam Tithi',
    hindi: 'जन्म तिथि',
    en: 'date of birth',
  },
  {
    id: 'time',
    hinglish: 'Janam Samay',
    hindi: 'जन्म समय',
    en: 'time of birth',
  },
  {
    id: 'place',
    hinglish: 'Janam Sthaan',
    hindi: 'जन्म स्थान',
    en: 'place of birth',
  },
];
