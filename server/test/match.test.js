import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_HOST ??= 'localhost';
process.env.DB_USER ??= 'test';
process.env.DB_NAME ??= 'test';
process.env.JWT_SECRET ??= 'test-secret';

const M = await import('../src/services/matchService.js');

test('weights sum to 100', () => {
  assert.equal(Object.values(M.WEIGHTS).reduce((a, b) => a + b, 0), 100);
});

test('smoking / pets rule', () => {
  assert.equal(M.yesNoFlexible('no', 'no'), 1);
  assert.equal(M.yesNoFlexible('flexible', 'flexible'), 1);
  assert.equal(M.yesNoFlexible('no', 'flexible'), 0.7);
  assert.equal(M.yesNoFlexible('flexible', 'yes'), 0.7);
  assert.equal(M.yesNoFlexible('yes', 'no'), 0);
  assert.equal(M.yesNoFlexible('no', 'yes'), 0);
});

test('parties rule', () => {
  assert.equal(M.parties('occasionally', 'occasionally'), 1);
  assert.equal(M.parties('flexible', 'no'), 0.7);
  assert.equal(M.parties('occasionally', 'flexible'), 0.7);
  assert.equal(M.parties('occasionally', 'no'), 0.4);
  assert.equal(M.parties('no', 'occasionally'), 0.4);
});

test('cleanliness rule', () => {
  assert.equal(M.cleanliness(3, 3), 1);
  assert.equal(M.cleanliness(1, 5), 0);
  assert.equal(M.cleanliness(4, 2), 0.5);
});

test('budget rule: overlap ÷ smaller range', () => {
  assert.equal(M.budget(10000, 20000, 15000, 25000), 0.5);
  assert.equal(M.budget(10000, 30000, 15000, 20000), 1, 'contained range');
  assert.equal(M.budget(10000, 15000, 16000, 20000), 0, 'no overlap');
  assert.equal(M.budget(10000, 15000, 15000, 20000), 0, 'touching at one point has zero overlap length');
  assert.equal(M.budget(15000, 15000, 10000, 20000), 1, 'zero-width range inside the other');
  assert.equal(M.budget(25000, 25000, 10000, 20000), 0, 'zero-width range outside');
});

test('move-in rule', () => {
  assert.equal(M.moveIn('2026-12-01', '2026-12-15'), 1, '14 days');
  assert.equal(M.moveIn('2026-12-01', '2027-03-01'), 0, '90 days');
  assert.equal(M.moveIn('2026-12-01', '2027-01-22'), 0.5, '52 days = halfway between 14 and 90');
  assert.equal(M.moveIn('2027-01-22', '2026-12-01'), 0.5, 'order does not matter');
});

test('location rule', () => {
  assert.equal(M.location(9, 5, true), 1, 'same area wins regardless of distance');
  assert.equal(M.location(0, 10, false), 1);
  assert.equal(M.location(2.5, 10, false), 0.75);
  assert.equal(M.location(10, 10, false), 0);
  assert.equal(M.location(30, 10, false), 0);
});

test('status thresholds', () => {
  assert.equal(M.statusFor(1), 'match');
  assert.equal(M.statusFor(0.85), 'match');
  assert.equal(M.statusFor(0.849), 'partial');
  assert.equal(M.statusFor(0.35), 'partial');
  assert.equal(M.statusFor(0.349), 'conflict');
});

const base = {
  area: { id: 1 }, coords: { lat: 13.0063, lng: 80.2574 }, searchRadiusKm: 5,
  smoking: 'no', pets: 'flexible', parties: 'occasionally', cleanliness: 4,
  budgetMin: 15000, budgetMax: 24000, moveInDate: '2026-12-01',
};

test('computeMatch: identical profiles score 100 with all matches', () => {
  const r = M.computeMatch(base, { ...base });
  assert.equal(r.score, 100);
  assert.equal(r.breakdown.length, 7);
  assert.ok(r.breakdown.every((b) => b.status === 'match' && b.points === b.weight));
  assert.equal(r.breakdown.find((b) => b.factor === 'location').detail, 'Same neighbourhood');
});

test('computeMatch: worked example adds up', () => {
  const other = {
    ...base,
    area: { id: 2 },
    coords: { lat: 12.9791, lng: 80.2212 }, // Velachery, ~5.0 km from Adyar
    smoking: 'yes', // 0
    pets: 'yes', // 0.7
    parties: 'no', // 0.4
    cleanliness: 2, // 0.5
    budgetMin: 20000, budgetMax: 30000, // overlap 4000 / smaller 9000 = 0.444
    moveInDate: '2027-01-22', // 52 days → 0.5
  };
  const r = M.computeMatch({ ...base, searchRadiusKm: 10 }, other);
  const by = Object.fromEntries(r.breakdown.map((b) => [b.factor, b]));
  assert.equal(by.smoking.status, 'conflict');
  assert.equal(by.pets.score, 0.7);
  assert.equal(by.parties.score, 0.4);
  assert.equal(by.cleanliness.score, 0.5);
  assert.equal(by.budget.score, 0.444);
  assert.equal(by.moveIn.score, 0.5);
  assert.ok(by.location.score > 0.49 && by.location.score < 0.51, `location ${by.location.score}`);
  // 0 + 10.5 + 6 + 7.5 + 8.89 + 5 + ~5 ≈ 42.9
  const expected = Math.round(0 * 15 + 0.7 * 15 + 0.4 * 15 + 0.5 * 15 + (4000 / 9000) * 20 + 0.5 * 10 + by.location.score * 10);
  assert.equal(r.score, expected);
  assert.match(by.budget.detail, /overlap by ₹4,000/);
  assert.match(by.smoking.detail, /smoke-free; they’re a smoker/);
});
