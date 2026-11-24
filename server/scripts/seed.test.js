import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transformCard } from './seed.js';

test('transformCard adds slug as _id', () => {
  const result = transformCard('amazon-pay-icici', { name: 'Amazon Pay ICICI', issuer: 'ICICI Bank' });
  assert.strictEqual(result._id, 'amazon-pay-icici');
});

test('transformCard does not mutate the original object', () => {
  const original = { name: 'Test Card', issuer: 'Test Bank' };
  transformCard('test-slug', original);
  assert.strictEqual(original._id, undefined);
});

test('transformCard preserves all card fields', () => {
  const card = { name: 'X', issuer: 'Y', perks: ['A', 'B'], fees: { joining: 0, annual: 500 } };
  const result = transformCard('x-y', card);
  assert.strictEqual(result.name, 'X');
  assert.strictEqual(result.issuer, 'Y');
  assert.deepStrictEqual(result.perks, ['A', 'B']);
  assert.deepStrictEqual(result.fees, { joining: 0, annual: 500 });
});
