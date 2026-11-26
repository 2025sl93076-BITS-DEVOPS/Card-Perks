import { Router } from 'express';
import jwt from 'jsonwebtoken';
import Groq from 'groq-sdk';
import { writeFile, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const yaml = require('js-yaml');
import Card from '../models/Card.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data/cards');

function cardToYaml(card) {
  const doc = {
    name: card.name,
    issuer: card.issuer,
    network: card.network || null,
    fees: {
      joining: card.fees?.joining ?? 0,
      annual: card.fees?.annual ?? 0,
    },
    rewards: {
      base_rate: card.rewards?.base_rate || '',
      categories: (card.rewards?.categories || []).map(c => ({
        merchant: c.merchant,
        rate: c.rate,
        cap: c.cap || null,
      })),
    },
    eligibility: {
      min_age: card.eligibility?.min_age || null,
      min_monthly_income: card.eligibility?.min_monthly_income || null,
      notes: card.eligibility?.notes || null,
    },
    perks: card.perks || [],
    source: card.source || '',
    last_verified: card.last_verified || new Date().toISOString().slice(0, 10),
  };
  return yaml.dump(doc, { lineWidth: 120, quotingType: '"', forceQuotes: false });
}

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ message: 'Invalid password' });
  }
  const token = jwt.sign({ role: 'admin' }, process.env.ADMIN_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

// POST /api/admin/extract — use Groq to extract card data from raw text
router.post('/extract', requireAdmin, async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ message: 'No text provided' });

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `You are a credit card data extractor. Extract structured data from the following Indian bank credit card page text and return ONLY a valid JSON object. No explanation, no markdown, just raw JSON.

Required JSON structure:
{
  "name": "Full card name",
  "issuer": "Bank name e.g. SBI Card / HDFC Bank / ICICI Bank",
  "network": "Visa or Mastercard or RuPay or Amex or null",
  "slug": "lowercase-hyphenated-id e.g. cashback-sbi-card",
  "fees": {
    "joining": 0,
    "annual": 0
  },
  "rewards": {
    "base_rate": "Human-readable base reward rate string",
    "categories": [
      { "merchant": "Category or merchant name", "rate": "reward rate string", "cap": "cap or null" }
    ]
  },
  "eligibility": {
    "min_age": null,
    "min_monthly_income": null,
    "notes": null
  },
  "perks": ["perk 1", "perk 2"],
  "source": "https://... official page URL if mentioned, else null",
  "last_verified": "${new Date().toISOString().slice(0, 10)}"
}

Rules:
- fees must be numbers (0 if free, not null)
- If a fee is waived on spending threshold, still put the actual fee amount
- Extract as many bonus categories as mentioned
- perks = lounge access, fuel surcharge waiver, insurance, milestone benefits etc.
- slug must be unique: card-name-issuer-short e.g. "freedom-hdfc"

Card page text:
---
${text.slice(0, 8000)}
---`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'qwen/qwen3.8-27b',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 2000,
    });

    const raw = completion.choices[0]?.message?.content?.trim();

    // Strip <think>...</think> block (qwen3 reasoning model)
    const noThink = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    // Strip markdown code fences if present
    const jsonStr = noThink.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const card = JSON.parse(jsonStr);

    res.json({ card });
  } catch (err) {
    res.status(500).json({ message: `Groq extraction failed: ${err.message}` });
  }
});

// GET /api/admin/cards — all cards (full data)
router.get('/cards', requireAdmin, async (req, res) => {
  try {
    const cards = await Card.find().sort({ issuer: 1, name: 1 });
    res.json(cards);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/cards — create card + write YAML
router.post('/cards', requireAdmin, async (req, res) => {
  try {
    const card = new Card(req.body);
    const saved = await card.save();

    // Write YAML file
    const slug = saved._id;
    const yamlContent = cardToYaml(saved);
    await writeFile(join(DATA_DIR, `${slug}.yaml`), yamlContent, 'utf8');

    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/admin/cards/:id — update card + merge-update YAML
router.put('/cards/:id', requireAdmin, async (req, res) => {
  try {
    const { _id, slug, ...updateData } = req.body;
    const card = await Card.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!card) return res.status(404).json({ message: 'Card not found' });

    // Read existing YAML if it exists, merge only changed fields
    const yamlPath = join(DATA_DIR, `${card._id}.yaml`);
    let existing = {};
    try {
      const raw = await readFile(yamlPath, 'utf8');
      existing = yaml.load(raw) || {};
    } catch {
      // File doesn't exist yet — will create fresh
    }

    // Build merged doc: start from existing, overwrite only fields present in updateData
    const merged = { ...existing };
    if (updateData.name        !== undefined) merged.name        = card.name;
    if (updateData.issuer      !== undefined) merged.issuer      = card.issuer;
    if (updateData.network     !== undefined) merged.network     = card.network ?? null;
    if (updateData.fees        !== undefined) merged.fees        = { joining: card.fees.joining, annual: card.fees.annual };
    if (updateData.rewards     !== undefined) merged.rewards     = {
      base_rate: card.rewards.base_rate,
      categories: (card.rewards.categories || []).map(c => ({ merchant: c.merchant, rate: c.rate, cap: c.cap || null })),
    };
    if (updateData.eligibility !== undefined) merged.eligibility = {
      min_age: card.eligibility?.min_age || null,
      min_monthly_income: card.eligibility?.min_monthly_income || null,
      notes: card.eligibility?.notes || null,
    };
    if (updateData.perks       !== undefined) merged.perks       = card.perks || [];
    if (updateData.source      !== undefined) merged.source      = card.source || '';
    if (updateData.last_verified !== undefined) merged.last_verified = card.last_verified || '';

    await writeFile(yamlPath, yaml.dump(merged, { lineWidth: 120, quotingType: '"', forceQuotes: false }), 'utf8');

    res.json(card);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/admin/cards/:id — delete card + remove YAML
router.delete('/cards/:id', requireAdmin, async (req, res) => {
  try {
    const card = await Card.findByIdAndDelete(req.params.id);
    if (!card) return res.status(404).json({ message: 'Card not found' });

    // Remove YAML file (ignore if not found)
    import('fs').then(({ unlink }) =>
      unlink(join(DATA_DIR, `${card._id}.yaml`), () => {})
    );

    res.json({ message: 'Card deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

