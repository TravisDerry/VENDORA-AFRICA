const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeBusinessCategory, normalizeCountry, buildBusinessPayload } = require('./registration');

test('maps category labels to backend enum values', () => {
  assert.equal(normalizeBusinessCategory('Phones & electronics'), 'phones');
  assert.equal(normalizeBusinessCategory('Cosmetics & beauty'), 'cosmetics');
  assert.equal(normalizeBusinessCategory('Hardware & building'), 'hardware');
  assert.equal(normalizeBusinessCategory('Aluminum & glass works'), 'aluminum');
});

test('maps country labels to backend country values', () => {
  assert.equal(normalizeCountry('Ghana'), 'ghana');
  assert.equal(normalizeCountry('Ivory Coast'), 'ivorycoast');
  assert.equal(normalizeCountry('Other'), 'other');
});

test('builds backend payload from form state', () => {
  const payload = buildBusinessPayload({
    firstName: 'Ada',
    lastName: 'Darko',
    businessName: 'Ada Mart',
    phoneNumber: '+233245678901',
    businessCategory: 'Phones & electronics',
    country: 'Ghana',
    email: 'ada@example.com',
    businessDescription: 'Quality electronics and accessories.'
  });

  assert.deepEqual(payload, {
    firstName: 'Ada',
    lastName: 'Darko',
    businessName: 'Ada Mart',
    phoneNumber: '+233245678901',
    businessCategory: 'phones',
    country: 'ghana',
    email: 'ada@example.com',
    businessDescription: 'Quality electronics and accessories.',
    city: '',
    address: ''
  });
});
