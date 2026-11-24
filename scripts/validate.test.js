import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { validateCards } from './validate.js';

const SCHEMA_PATH = fileURLToPath(new URL('../data/schema.json', import.meta.url));

const VALID_CARD = `
name: Test Card
issuer: Test Bank
network: Visa
fees:
  joining: 500
  annual: 500
rewards:
  base_rate: "1% on all spends"
eligibility:
  min_age: 21
  min_monthly_income: 30000
  notes: null
perks:
  - "Fuel surcharge waiver"
source: "https://example.com/card"
last_verified: "2026-11-24"
`.trim();

function makeTempDir() {
  return mkdtempSync(join(tmpdir(), 'cp-test-'));
}

function cleanup(dir) {
  rmSync(dir, { recursive: true, force: true });
}

test('valid card passes', () => {
  const dir = makeTempDir();
  try {
    writeFileSync(join(dir, 'test-card.yaml'), VALID_CARD);
    const result = validateCards(dir, SCHEMA_PATH);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  } finally { cleanup(dir); }
});

test('card missing required name fails', () => {
  const dir = makeTempDir();
  try {
    const card = VALID_CARD.replace(/^name:.*\n/m, '');
    writeFileSync(join(dir, 'missing-name.yaml'), card);
    const result = validateCards(dir, SCHEMA_PATH);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length >= 1);
    assert.ok(result.errors[0].file.endsWith('.yaml'), `expected .yaml filename, got: ${result.errors[0].file}`);
    assert.ok(result.errors[0].message.length > 0);
  } finally { cleanup(dir); }
});

test('all errors reported, not fail-fast', () => {
  const dir = makeTempDir();
  try {
    const card = VALID_CARD.replace(/^name:.*\n/m, '').replace(/^issuer:.*\n/m, '');
    writeFileSync(join(dir, 'multi-error.yaml'), card);
    const result = validateCards(dir, SCHEMA_PATH);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length >= 2, `expected >= 2 errors, got ${result.errors.length}`);
  } finally { cleanup(dir); }
});

test('perks: null rejected', () => {
  const dir = makeTempDir();
  try {
    const card = VALID_CARD.replace(/^perks:.*$/m, 'perks: ~');
    writeFileSync(join(dir, 'null-perks.yaml'), card);
    const result = validateCards(dir, SCHEMA_PATH);
    assert.equal(result.valid, false);
  } finally { cleanup(dir); }
});

test('rewards.categories omitted is valid', () => {
  const dir = makeTempDir();
  try {
    writeFileSync(join(dir, 'no-categories.yaml'), VALID_CARD);
    const result = validateCards(dir, SCHEMA_PATH);
    assert.equal(result.valid, true);
  } finally { cleanup(dir); }
});

test('fees.joining: 0 is valid', () => {
  const dir = makeTempDir();
  try {
    const card = VALID_CARD.replace('joining: 500', 'joining: 0').replace('annual: 500', 'annual: 0');
    writeFileSync(join(dir, 'free-card.yaml'), card);
    const result = validateCards(dir, SCHEMA_PATH);
    assert.equal(result.valid, true);
  } finally { cleanup(dir); }
});

test('YAML parse error reported per-file, other files still checked', () => {
  const dir = makeTempDir();
  try {
    writeFileSync(join(dir, 'malformed.yaml'), 'name: [unclosed');
    writeFileSync(join(dir, 'valid-card.yaml'), VALID_CARD);
    const result = validateCards(dir, SCHEMA_PATH);
    assert.equal(result.valid, false);
    assert.ok(
      result.errors.some(e => e.file === 'malformed.yaml'),
      `expected error for malformed.yaml, got: ${JSON.stringify(result.errors)}`
    );
    assert.ok(
      !result.errors.some(e => e.file === 'valid-card.yaml'),
      'valid card should not have errors'
    );
  } finally { cleanup(dir); }
});
