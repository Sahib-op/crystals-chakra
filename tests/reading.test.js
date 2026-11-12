import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCosmicReading } from '../src/cosmicEngine.js';
import { validBirthDate } from '../src/lib/birthDate.js';
test('browser engine rejects impossible dates and noncanonical input', () => {
  for (const value of [
    '1900-02-29',
    '2024-02-30',
    '2000-13-01',
    '2000-01-32',
    '2000-1-01',
    '2000-01-01-extra',
    '2999-01-01',
    null,
  ])
    assert.equal(generateCosmicReading(value, 'Demo'), null);
  assert.ok(generateCosmicReading('2000-02-29', 'Demo'));
  assert.equal(validBirthDate('2000-02-29', '2000-02-28'), false);
});
test('zodiac boundaries handle year wrap and adjacent signs', () => {
  for (const [date, sign] of [
    ['2000-12-21', 'Sagittarius'],
    ['2000-12-22', 'Capricorn'],
    ['2000-01-19', 'Capricorn'],
    ['2000-01-20', 'Aquarius'],
    ['2000-03-20', 'Pisces'],
    ['2000-03-21', 'Aries'],
  ])
    assert.equal(generateCosmicReading(date, 'Demo').zodiac.name, sign);
});
test('life path preserves master numbers and remains independent of name', () => {
  const a = generateCosmicReading('2000-01-08', 'One');
  const b = generateCosmicReading('2000-01-08', 'Two');
  assert.equal(a.numerology.number, 11);
  assert.deepEqual(a, b);
  assert.equal(
    generateCosmicReading('2000-01-01', 'Demo').numerology.number,
    4,
  );
});

test('every day of a leap year maps to the expected tropical date range', () => {
  const cutoffs = [
    [119, 'Capricorn'],
    [218, 'Aquarius'],
    [320, 'Pisces'],
    [419, 'Aries'],
    [520, 'Taurus'],
    [620, 'Gemini'],
    [722, 'Cancer'],
    [822, 'Leo'],
    [922, 'Virgo'],
    [1022, 'Libra'],
    [1121, 'Scorpio'],
    [1221, 'Sagittarius'],
    [1231, 'Capricorn'],
  ];
  for (let month = 1; month <= 12; month++) {
    for (let day = 1; day <= 31; day++) {
      const dob =
        '2000-' +
        String(month).padStart(2, '0') +
        '-' +
        String(day).padStart(2, '0');
      if (!validBirthDate(dob)) continue;
      const expected = cutoffs.find(([last]) => month * 100 + day <= last)[1];
      assert.equal(generateCosmicReading(dob).zodiac.name, expected, dob);
    }
  }
});
test('calculation explains reductions and preserves each master number', () => {
  for (const [date, number, totals] of [
    ['2000-01-01', 4, [4]],
    ['1990-02-08', 11, [29, 11]],
    ['2000-09-29', 22, [22]],
    ['1990-09-23', 33, [33]],
    ['1999-12-31', 8, [35, 8]],
  ]) {
    const result = generateCosmicReading(date).numerology;
    assert.equal(result.number, number);
    assert.deepEqual(
      result.calculation.steps.map((step) => step.total),
      totals,
    );
    assert.deepEqual(
      result.calculation.steps[0].digits,
      date.replaceAll('-', '').split('').map(Number),
    );
  }
});
test('reading data belongs to each result and cannot corrupt later readings', () => {
  const result = generateCosmicReading('2000-01-01');
  result.zodiac.traits.length = 0;
  result.numerology.lines[0] = 'changed';
  const fresh = generateCosmicReading('2000-01-01');
  assert.ok(fresh.zodiac.traits.length);
  assert.notEqual(fresh.numerology.lines[0], 'changed');
});
