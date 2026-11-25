import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PROMPT_PATH = join(__dirname, '../docs/extractor-prompt.md');
const CARDS_DIR = join(__dirname, '../data/cards');
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-oss-120b';
const PLACEHOLDER = '[PASTE THE CARD PAGE TEXT HERE]';

export function buildPrompt(promptTemplate, rawText) {
  return promptTemplate.replace(PLACEHOLDER, rawText);
}

export function stripToYaml(raw) {
  let t = raw.trim();
  t = t.replace(/^```[a-zA-Z]*\n/, '');
  t = t.replace(/\n```\s*$/, '');
  const idx = t.search(/^name:/m);
  if (idx !== -1) t = t.slice(idx);
  return t.trim() + '\n';
}

async function callGroq(prompt, apiKey, model) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Groq API error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { default: dotenv } = await import('dotenv');
  dotenv.config({ path: join(__dirname, '../server/.env') });

  const [rawFile, slug] = process.argv.slice(2);
  if (!rawFile || !slug) {
    process.stderr.write('Usage: npm run extract -- <raw-text-file> <slug>\n');
    process.exit(1);
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    process.stderr.write('GROQ_API_KEY missing in server/.env (get a free key at console.groq.com)\n');
    process.exit(1);
  }

  const template = readFileSync(PROMPT_PATH, 'utf8');
  const rawText = readFileSync(rawFile, 'utf8');
  const prompt = buildPrompt(template, rawText);

  const model = process.env.GROQ_MODEL || DEFAULT_MODEL;
  process.stderr.write(`Extracting via Groq (${model})...\n`);
  const response = await callGroq(prompt, apiKey, model);
  const yaml = stripToYaml(response);

  const outPath = join(CARDS_DIR, `${slug}.yaml`);
  writeFileSync(outPath, yaml);
  process.stdout.write(`Draft written to data/cards/${slug}.yaml\n`);
  process.stdout.write('VERIFY it against the source, then run: npm run validate\n');
}
