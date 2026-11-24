import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { load } from 'js-yaml';
import Ajv from 'ajv';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DEFAULT_CARDS_DIR = join(__dirname, '../data/cards');
const DEFAULT_SCHEMA_PATH = join(__dirname, '../data/schema.json');

export function validateCards(cardsDir, schemaPath) {
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);

  const files = readdirSync(cardsDir).filter(
    f => f.endsWith('.yaml') && f !== 'TEMPLATE.yaml'
  );

  const errors = [];

  for (const file of files) {
    const filePath = join(cardsDir, file);
    let card;
    try {
      card = load(readFileSync(filePath, 'utf8'));
    } catch (e) {
      errors.push({ file, field: '(parse)', message: e.message });
      continue;
    }

    const valid = validate(card);
    if (!valid) {
      for (const err of validate.errors) {
        errors.push({
          file,
          field: err.instancePath || '(root)',
          message: err.message,
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// CLI runner — only executes when this file is the entry point
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = validateCards(DEFAULT_CARDS_DIR, DEFAULT_SCHEMA_PATH);
  if (!result.valid) {
    for (const e of result.errors) {
      process.stderr.write(`${e.file}: ${e.field} ${e.message}\n`);
    }
    process.stderr.write(`\nValidation failed: ${result.errors.length} error(s)\n`);
    process.exit(1);
  }
  const count = readdirSync(DEFAULT_CARDS_DIR).filter(
    f => f.endsWith('.yaml') && f !== 'TEMPLATE.yaml'
  ).length;
  console.log(`All ${count} card(s) valid.`);
}
