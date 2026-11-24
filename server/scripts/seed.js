import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { load } from 'js-yaml';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const CARDS_DIR = join(__dirname, '../../data/cards');
const SCHEMA_PATH = join(__dirname, '../../data/schema.json');

export function transformCard(slug, cardData) {
  return { _id: slug, ...cardData };
}

// CLI runner — only executes when this file is the entry point
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { default: dotenv } = await import('dotenv');
  dotenv.config({ path: join(__dirname, '../.env') });

  const { validateCards } = await import('../../scripts/validate.js');
  const { default: mongoose } = await import('mongoose');
  const { default: connectDB } = await import('../config/db.js');
  const { default: Card } = await import('../models/Card.js');

  const { valid, errors } = validateCards(CARDS_DIR, SCHEMA_PATH);
  if (!valid) {
    for (const e of errors) {
      process.stderr.write(`${e.file}: ${e.field} — ${e.message}\n`);
    }
    process.stderr.write(`\nSeed aborted: ${errors.length} validation error(s)\n`);
    process.exit(1);
  }

  await connectDB();

  await Card.deleteMany({});

  const files = readdirSync(CARDS_DIR).filter(
    f => f.endsWith('.yaml') && f !== 'TEMPLATE.yaml'
  );

  for (const file of files) {
    const slug = file.replace(/\.yaml$/, '');
    const cardData = load(readFileSync(join(CARDS_DIR, file), 'utf8'));
    await Card.create(transformCard(slug, cardData));
  }

  console.log(`Seeded ${files.length} card(s)`);
  await mongoose.disconnect();
}
