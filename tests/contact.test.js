import test from 'node:test';
import assert from 'node:assert/strict';
import {
  whatsappHref,
  telephoneHref,
  readingContact,
  readingMessage,
  productEnquiryHref,
} from '../shared/contact.js';
import { services, isReadingCatalog } from '../shared/catalog.js';

test('reading handoff targets only the configured studio and includes the chosen package', () => {
  for (const reading of services) {
    const contact = readingContact(reading),
      url = new URL(contact.whatsapp);
    assert.equal(url.origin, 'https://wa.me');
    assert.equal(url.pathname, '/919810228209');
    assert.ok(url.searchParams.get('text').includes(reading.title));
    assert.equal(contact.telephone, 'tel:+919810228209');
  }
  assert.ok(readingContact(services[0]).message.includes('Amanpreet Kaur'));
});
test('plain Hindi and punctuation survive one URL encoding without adding query parameters', () => {
  const text = 'नमस्ते! भृगु पत्रिका & "Tarot"? #reading 50% + career';
  const url = new URL(whatsappHref(text));
  assert.equal(url.searchParams.get('text'), text);
  assert.deepEqual([...url.searchParams.keys()], ['text']);
  assert.equal(url.hash, '');
});
test('missing or untrusted reading fields cannot replace the destination or leak contact details', () => {
  const fallback = readingContact();
  assert.ok(fallback.message.includes('help me choose'));
  const result = readingContact({
    title: 'Test',
    contactDestination: 'https://evil.example',
    phone: '123',
    dob: '2000-01-01',
    name: 'Private',
  });
  assert.equal(new URL(result.whatsapp).pathname, '/919810228209');
  assert.equal(result.message.includes('Private'), false);
  assert.equal(result.message.includes('2000-01-01'), false);
  assert.throws(() => whatsappHref('test', 'https://evil.example'), RangeError);
  assert.throws(() => telephoneHref('__proto__'), RangeError);
});
test('messages are bounded and control characters are not passed through', () => {
  const long = whatsappHref('🙂'.repeat(900));
  assert.equal(Array.from(new URL(long).searchParams.get('text')).length, 600);
  assert.equal(
    new URL(whatsappHref('Hello\n\u0000\u202eStudio')).searchParams.get('text'),
    'Hello Studio',
  );
  assert.ok(readingMessage({ title: 'x'.repeat(900) }).length < 260);
  assert.ok(
    new URL(productEnquiryHref({ title: 'Amethyst & Rose' })).searchParams
      .get('text')
      .includes('Amethyst & Rose'),
  );
});
test('tarot and astrology use one valid catalogue without an invented tarot price', () => {
  assert.equal(isReadingCatalog(services), true);
  assert.equal(services.filter((s) => s.type === 'astrology').length, 3);
  assert.equal(services.find((s) => s.type === 'tarot').price, null);
  assert.equal(isReadingCatalog([]), true);
  for (const invalid of [
    null,
    {},
    [...services, services[0]],
    Array.from({ length: 41 }, (_, i) => ({
      ...services[0],
      id: `tarot-${i}`,
    })),
    [{ ...services[0], price: -1 }],
    [{ ...services[0], features: 'invalid' }],
    [{ ...services[0], title: '' }],
  ]) {
    assert.equal(isReadingCatalog(invalid), false);
  }
});
