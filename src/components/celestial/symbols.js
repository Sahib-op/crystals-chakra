// Tarot cards that orbit in the welcome scene. Each explanation is a short,
// reflective starting point; About Astrology & Tarot has fuller meanings.
export function tarotArtwork(id) {
  return `/images/tarot/${id}.jpg`;
}

export const SYMBOLS = [
  {
    id: 'sun',
    name: 'The Sun',
    numeral: 'XIX',
    kind: 'sun',
    text: 'Warmth, clarity and openness. A prompt to notice what gives you energy and to let yourself be seen.',
  },
  {
    id: 'moon',
    name: 'The Moon',
    numeral: 'XVIII',
    kind: 'moon',
    text: 'Intuition and uncertainty. A reminder to give a question time before rushing to an answer.',
  },
  {
    id: 'star',
    name: 'The Star',
    numeral: 'XVII',
    kind: 'star',
    text: 'Hope and renewal after a difficult time. A moment to reconnect with what you want to grow.',
  },
  {
    id: 'magician',
    name: 'The Magician',
    numeral: 'I',
    kind: 'magician',
    text: 'Focus and skill. You already hold the tools you need; the question is where to direct them.',
  },
  {
    id: 'priestess',
    name: 'The High Priestess',
    numeral: 'II',
    kind: 'priestess',
    text: 'Quiet knowing. An invitation to listen inwardly and trust what you notice before you act.',
  },
  {
    id: 'wheel',
    name: 'Wheel of Fortune',
    numeral: 'X',
    kind: 'wheel',
    text: 'Cycles and change. Circumstances turn; a reading looks at how you might meet the turn.',
  },
];
