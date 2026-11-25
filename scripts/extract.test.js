import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripToYaml, buildPrompt } from './extract.js';

test('stripToYaml passes clean yaml through unchanged', () => {
  const input = 'name: Test Card\nissuer: Test Bank';
  const result = stripToYaml(input);
  assert.equal(result, 'name: Test Card\nissuer: Test Bank\n');
});

test('stripToYaml removes ```yaml code fences', () => {
  const input = '```yaml\nname: Test Card\nissuer: Test Bank\n```';
  const result = stripToYaml(input);
  assert.equal(result, 'name: Test Card\nissuer: Test Bank\n');
});

test('stripToYaml removes bare ``` fences', () => {
  const input = '```\nname: Test Card\n```';
  const result = stripToYaml(input);
  assert.equal(result, 'name: Test Card\n');
});

test('stripToYaml drops preamble before the first name: line', () => {
  const input = 'Here is the extracted YAML:\n\nname: Test Card\nissuer: Test Bank';
  const result = stripToYaml(input);
  assert.equal(result, 'name: Test Card\nissuer: Test Bank\n');
});

test('stripToYaml drops leading slug: and --- lines', () => {
  const input = 'slug: test-card-bank\n---\nname: Test Card\nissuer: Test Bank';
  const result = stripToYaml(input);
  assert.equal(result, 'name: Test Card\nissuer: Test Bank\n');
});

test('buildPrompt injects raw text into the placeholder', () => {
  const template = 'Schema here.\n\n[PASTE THE CARD PAGE TEXT HERE]\n\nReturn only YAML.';
  const result = buildPrompt(template, 'Annual Fee: Rs. 999');
  assert.ok(result.includes('Annual Fee: Rs. 999'));
  assert.ok(!result.includes('[PASTE THE CARD PAGE TEXT HERE]'));
});

test('buildPrompt keeps the rest of the template intact', () => {
  const template = 'Schema here.\n\n[PASTE THE CARD PAGE TEXT HERE]\n\nReturn only YAML.';
  const result = buildPrompt(template, 'some text');
  assert.ok(result.includes('Schema here.'));
  assert.ok(result.includes('Return only YAML.'));
});
