import { validBirthDate } from './lib/birthDate.js';
// cosmicEngine.js — Zodiac sign + Numerology Life Path calculator
// No external APIs or timezone parsing. Calendar input is YYYY-MM-DD.

export const ZODIAC_DATA = {
  aries: {
    name: 'Aries',
    dateRange: [
      [3, 21],
      [4, 19],
    ],
    element: 'Fire',
    rulingPlanet: 'Mars',
    traits: [
      'Bold',
      'Competitive',
      'Direct',
      'Pioneering',
      'Quick-tempered under pressure',
    ],
    lines: [
      "You move before you're fully ready, and that's usually the right call.",
      "Patience isn't your language — momentum is.",
      'The fire that gets you started can also burn the people trying to keep up.',
    ],
  },
  taurus: {
    name: 'Taurus',
    dateRange: [
      [4, 20],
      [5, 20],
    ],
    element: 'Earth',
    rulingPlanet: 'Venus',
    traits: ['Steady', 'Loyal', 'Sensual', 'Patient', 'Resistant to change'],
    lines: [
      'You build things slowly enough that they actually last.',
      "Comfort isn't laziness for you — it's a form of self-respect.",
      "Once you've decided something is true, moving you off it takes real effort.",
    ],
  },
  gemini: {
    name: 'Gemini',
    dateRange: [
      [5, 21],
      [6, 20],
    ],
    element: 'Air',
    rulingPlanet: 'Mercury',
    traits: [
      'Curious',
      'Witty',
      'Adaptable',
      'Communicative',
      'Easily scattered',
    ],
    lines: [
      "Your mind runs three conversations ahead of the one you're actually in.",
      'You collect ideas the way other people collect things — restlessly, constantly.',
      'Finishing is harder for you than starting; the next idea is always louder.',
    ],
  },
  cancer: {
    name: 'Cancer',
    dateRange: [
      [6, 21],
      [7, 22],
    ],
    element: 'Water',
    rulingPlanet: 'Moon',
    traits: [
      'Nurturing',
      'Intuitive',
      'Protective',
      'Sentimental',
      'Guarded when hurt',
    ],
    lines: [
      "You read a room before you've even sat down in it.",
      'What you love, you protect fiercely — sometimes too fiercely.',
      "You remember every wound precisely, even the ones you've said you forgave.",
    ],
  },
  leo: {
    name: 'Leo',
    dateRange: [
      [7, 23],
      [8, 22],
    ],
    element: 'Fire',
    rulingPlanet: 'Sun',
    traits: ['Confident', 'Generous', 'Magnetic', 'Warm', 'Craves recognition'],
    lines: [
      'You walk into rooms like they were already expecting you.',
      'Your generosity is real — but so is your need to be seen giving it.',
      'Being ignored costs you more than most people realize.',
    ],
  },
  virgo: {
    name: 'Virgo',
    dateRange: [
      [8, 23],
      [9, 22],
    ],
    element: 'Earth',
    rulingPlanet: 'Mercury',
    traits: [
      'Analytical',
      'Meticulous',
      'Practical',
      'Helpful',
      'Self-critical',
    ],
    lines: [
      'You notice the flaw in the plan before anyone else has finished proposing it.',
      "Helping people is how you show love — often before they've asked for it.",
      "The standard you hold yourself to is higher than the one you'd hold anyone else to.",
    ],
  },
  libra: {
    name: 'Libra',
    dateRange: [
      [9, 23],
      [10, 22],
    ],
    element: 'Air',
    rulingPlanet: 'Venus',
    traits: [
      'Diplomatic',
      'Charming',
      'Fair-minded',
      'Harmony-seeking',
      'Conflict-avoidant',
    ],
    lines: [
      'You can see both sides of an argument so clearly it delays picking one.',
      'A room feels off-balance to you before anyone else notices the tension.',
      'Keeping the peace sometimes costs you saying what you actually think.',
    ],
  },
  scorpio: {
    name: 'Scorpio',
    dateRange: [
      [10, 23],
      [11, 21],
    ],
    element: 'Water',
    rulingPlanet: 'Mars / Pluto',
    traits: [
      'Intense',
      'Resourceful',
      'Loyal',
      'Private',
      'Suspicious when trust breaks',
    ],
    lines: [
      'You feel everything at full volume, even when your face shows nothing.',
      "Once you're in, you're all the way in — and you expect the same back.",
      "Betrayal doesn't just hurt you, it recalibrates how you trust from then on.",
    ],
  },
  sagittarius: {
    name: 'Sagittarius',
    dateRange: [
      [11, 22],
      [12, 21],
    ],
    element: 'Fire',
    rulingPlanet: 'Jupiter',
    traits: ['Adventurous', 'Optimistic', 'Philosophical', 'Blunt', 'Restless'],
    lines: [
      "You'd rather find out the hard way than be told how it ends.",
      "Honesty comes first for you, even when tact would've landed softer.",
      'Staying still for too long starts to feel like something is wrong.',
    ],
  },
  capricorn: {
    name: 'Capricorn',
    dateRange: [
      [12, 22],
      [1, 19],
    ],
    element: 'Earth',
    rulingPlanet: 'Saturn',
    traits: [
      'Disciplined',
      'Ambitious',
      'Patient',
      'Reliable',
      'Guarded about needs',
    ],
    lines: [
      "You'll outwork almost anyone, quietly, without needing an audience for it.",
      'Long-term is the only timescale that ever feels real to you.',
      "Asking for help doesn't come naturally — you'd rather carry it alone.",
    ],
  },
  aquarius: {
    name: 'Aquarius',
    dateRange: [
      [1, 20],
      [2, 18],
    ],
    element: 'Air',
    rulingPlanet: 'Saturn / Uranus',
    traits: [
      'Independent',
      'Inventive',
      'Humanitarian',
      'Unconventional',
      'Emotionally detached',
    ],
    lines: [
      "You'd rather be right about the future than liked in the present.",
      'Belonging to a group matters less to you than belonging to an idea.',
      'You can care about people deeply while still feeling one step removed from them.',
    ],
  },
  pisces: {
    name: 'Pisces',
    dateRange: [
      [2, 19],
      [3, 20],
    ],
    element: 'Water',
    rulingPlanet: 'Jupiter / Neptune',
    traits: [
      'Empathetic',
      'Imaginative',
      'Artistic',
      'Dreamy',
      'Easily overwhelmed',
    ],
    lines: [
      "Other people's emotions land in you like they were your own.",
      "You live half in the room and half in whatever you're imagining.",
      "The world's volume gets loud for you faster than it does for most.",
    ],
  },
};

export const NUMEROLOGY_DATA = {
  1: {
    name: 'The Leader',
    traits: [
      'Independent',
      'Pioneering',
      'Driven',
      'Confident',
      'Impatient with slower pace',
    ],
    lines: [
      'You were built to go first, not to follow the path someone else already cleared.',
      'Waiting for permission has never really suited you.',
    ],
  },
  2: {
    name: 'The Diplomat',
    traits: [
      'Cooperative',
      'Sensitive',
      'Peacemaking',
      'Intuitive',
      'Prone to self-doubt',
    ],
    lines: [
      'You sense the mood of a room before a word is spoken in it.',
      'Your instinct is to close gaps between people, sometimes before your own needs.',
    ],
  },
  3: {
    name: 'The Communicator',
    traits: [
      'Expressive',
      'Creative',
      'Sociable',
      'Optimistic',
      'Prone to scattering focus',
    ],
    lines: [
      "Whatever you're feeling tends to find its way out — in words, in art, in a room full of people.",
      "Focus is the one thing that doesn't come as naturally as everything else.",
    ],
  },
  4: {
    name: 'The Builder',
    traits: [
      'Disciplined',
      'Practical',
      'Reliable',
      'Methodical',
      'Can be rigid',
    ],
    lines: [
      "You'd rather build something slow and solid than fast and shaky.",
      "Structure isn't a limitation to you — it's what makes anything possible.",
    ],
  },
  5: {
    name: 'The Adventurer',
    traits: [
      'Freedom-loving',
      'Adaptable',
      'Curious',
      'Energetic',
      'Inconsistent under routine',
    ],
    lines: [
      'Staying in one place, one job, one version of yourself for too long feels like a trap.',
      "Change doesn't scare you — staying still does.",
    ],
  },
  6: {
    name: 'The Nurturer',
    traits: [
      'Responsible',
      'Caring',
      'Community-minded',
      'Protective',
      'Prone to over-giving',
    ],
    lines: [
      "You take on other people's weight without being asked to.",
      "Caretaking comes so naturally it can be hard to notice when you're depleted.",
    ],
  },
  7: {
    name: 'The Seeker',
    traits: [
      'Analytical',
      'Introspective',
      'Spiritual',
      'Perceptive',
      'Prone to isolating',
    ],
    lines: [
      'You need real answers, not comfortable ones — even when the real ones are harder.',
      'Solitude recharges you in a way company rarely does.',
    ],
  },
  8: {
    name: 'The Achiever',
    traits: [
      'Ambitious',
      'Business-minded',
      'Authoritative',
      'Resilient',
      'Can over-value results',
    ],
    lines: [
      "You think in terms of outcomes — what got built, what got won, what's next.",
      "Power and money were never taboo subjects for you; they're just tools.",
    ],
  },
  9: {
    name: 'The Humanitarian',
    traits: [
      'Compassionate',
      'Idealistic',
      'Generous',
      'Wise',
      'Prone to self-sacrifice',
    ],
    lines: [
      'You feel responsible for more than just your own corner of the world.',
      'Letting go is a recurring lesson for you — of people, outcomes, old versions of yourself.',
    ],
  },
  11: {
    name: 'The Intuitive (Master Number)',
    traits: [
      'Visionary',
      'Inspirational',
      'Highly perceptive',
      'Sensitive',
      'Prone to anxiety under pressure',
    ],
    lines: [
      "You pick up on things before there's any proof they're true.",
      'The intensity that makes you inspiring is the same intensity that can wear you down.',
    ],
  },
  22: {
    name: 'The Master Builder (Master Number)',
    traits: [
      'Practical visionary',
      'Large-scale thinker',
      'Disciplined',
      'Capable',
      'Pressure-prone',
    ],
    lines: [
      "You don't just dream big — you're one of the rare ones who can actually build it.",
      "The scale of what you're capable of can be its own kind of weight to carry.",
    ],
  },
  33: {
    name: 'The Master Teacher (Master Number)',
    traits: [
      'Selfless',
      'Healing presence',
      'Compassionate at scale',
      'Rare',
      'Prone to overextending',
    ],
    lines: [
      'People bring you their real problems without quite knowing why they trust you with them.',
      "Giving that much of yourself, that consistently, needs boundaries you don't always set.",
    ],
  },
};

// Ordered for lookup — most signs are sequential month ranges,
// but Capricorn wraps Dec→Jan so we check it first.
const SIGN_ORDER = [
  'capricorn',
  'aquarius',
  'pisces',
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
];

/**
 * Get the zodiac sign from month (1-12) and day (1-31).
 * Handles the Capricorn wraparound (Dec 22 – Jan 19).
 */
export function getZodiacSign(month, day) {
  if (!validBirthDate(formatBirthDate(2000, month, day), '2000-12-31'))
    throw new RangeError('A valid calendar month and day are required.');
  // Capricorn wraps: Dec 22 → Jan 19
  const cap = ZODIAC_DATA.capricorn;
  const [[capStartMonth, capStartDay], [capEndMonth, capEndDay]] =
    cap.dateRange;
  if (
    (month === capStartMonth && day >= capStartDay) ||
    (month === capEndMonth && day <= capEndDay)
  ) {
    return 'capricorn';
  }

  // All other signs — sequential date ranges within a single month pair
  for (const key of SIGN_ORDER) {
    if (key === 'capricorn') continue;
    const [[startMonth, startDay], [endMonth, endDay]] =
      ZODIAC_DATA[key].dateRange;
    if (
      (month === startMonth && day >= startDay) ||
      (month === endMonth && day <= endDay)
    ) {
      return key;
    }
  }

  throw new RangeError('No sign range matched this date.');
}

/** Add every DOB digit; reduce totals while preserving master numbers. */
export function calculateLifePath(year, month, day) {
  if (!validBirthDate(formatBirthDate(year, month, day)))
    throw new RangeError(
      'A valid birth date between 1900 and today is required.',
    );
  const steps = [];
  let digits = formatBirthDate(year, month, day)
    .replaceAll('-', '')
    .split('')
    .map(Number);
  let total;
  do {
    total = digits.reduce((sum, digit) => sum + digit, 0);
    steps.push({ digits, total });
    digits = String(total).split('').map(Number);
  } while (total > 9 && ![11, 22, 33].includes(total));
  return { number: total, steps };
}
function formatBirthDate(year, month, day) {
  if (![year, month, day].every(Number.isInteger)) return '';
  return (
    String(year).padStart(4, '0') +
    '-' +
    String(month).padStart(2, '0') +
    '-' +
    String(day).padStart(2, '0')
  );
}
export function getLifePathNumber(year, month, day) {
  return calculateLifePath(year, month, day).number;
}
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** Pure, date-only calculation. No network calls or persistent storage. */
export function generateCosmicReading(dobString) {
  if (!validBirthDate(dobString)) return null;
  const [year, month, day] = dobString.split('-').map(Number);
  const signKey = getZodiacSign(month, day);
  const sign = ZODIAC_DATA[signKey];
  const calculation = calculateLifePath(year, month, day);
  const lifePath = NUMEROLOGY_DATA[calculation.number];
  return {
    zodiac: {
      key: signKey,
      name: sign.name,
      element: sign.element,
      rulingPlanet: sign.rulingPlanet,
      dateRangeLabel: sign.dateRange
        .map(([m, d]) => MONTHS[m - 1] + ' ' + d)
        .join(' – '),
      traits: [...sign.traits],
      lines: [...sign.lines],
    },
    numerology: {
      number: calculation.number,
      name: lifePath.name,
      traits: [...lifePath.traits],
      lines: [...lifePath.lines],
      calculation,
    },
  };
}
