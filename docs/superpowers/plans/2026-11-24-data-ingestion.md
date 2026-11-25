# Data Ingestion System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full data ingestion pipeline so credit card YAML files can be validated locally and in CI, and loaded into MongoDB via a seed script.

**Architecture:** YAML files in `data/cards/` are the source of truth. A JSON Schema + AJV validator enforces structure. A seed script validates then wipes and reloads MongoDB. GitHub Actions blocks any PR that fails validation.

**Tech Stack:** Node 18+ ESM, js-yaml 4, AJV 8, Mongoose 8, node:test (built-in), GitHub Actions

**Spec:** `docs/superpowers/specs/2026-11-24-data-ingestion-design.md` and `docs/HANDOFF.md`

## Global Constraints

- Node 18+ required; ESM throughout — `"type": "module"` in root and server `package.json`
- `js-yaml` and `ajv` added to root `package.json` `dependencies` (not devDependencies — seed.js uses them at runtime)
- Validator reports ALL errors in one pass (`allErrors: true`); never exits on first file failure
- Each error message names the file and field: `amazon-pay-icici.yaml: /fees/joining must be number`
- `TEMPLATE.yaml` is excluded from validation by filename check
- Slug = filename without `.yaml`; used as MongoDB `_id`
- Seed is idempotent: wipes the `cards` collection then reloads all files from `data/cards/`
- Seed refuses to run (exits 1, no DB writes) if any card file fails validation
- `perks: []` is valid; `perks: null` is not (schema enforces array type)
- `rewards.categories` is optional (not in schema `required`)
- `network`, `eligibility.min_age`, `eligibility.min_monthly_income`, `eligibility.notes`, and reward category `cap` are nullable

## Review Focus

1. **`perks: null`** — validator must reject it; must be an array even if empty. Test in Task 2.
2. **`rewards.categories` omitted** — must pass; it is optional. Test in Task 2.
3. **`fees.joining: 0`** — zero is a valid number (free card); schema must not treat falsy as missing. Test in Task 2.
4. **`network: null`** — nullable field must pass schema. Test in Task 2.
5. **YAML parse error in one file** — validator must report that file's error and continue checking the others; not fail-fast across files. Test in Task 2.

---

### Task 1: Data contract — `data/schema.json`, seed card, template

**Files:**
- Create: `data/schema.json`
- Create: `data/cards/amazon-pay-icici.yaml`
- Create: `data/cards/TEMPLATE.yaml`
- Modify: `package.json` (root) — add `"type": "module"`

**Interfaces:**
- Produces: `data/schema.json` — JSON Schema draft-07; consumed by Tasks 2 and 4
- Produces: `data/cards/amazon-pay-icici.yaml` — first real seed card; consumed by Task 2 tests and Task 4

- [ ] **Step 1: Add `"type": "module"` to root `package.json`**

Add at the top level alongside existing fields. No other changes.

- [ ] **Step 2: Create `data/schema.json`**

JSON Schema draft-07. Top level: `"$schema": "http://json-schema.org/draft-07/schema#"`, `"type": "object"`, `"additionalProperties": false`, `"required": ["name","issuer","fees","rewards","eligibility","perks","source","last_verified"]`.

Properties:
- `name`, `issuer`: `{ "type": "string" }`
- `network`: `{ "type": ["string", "null"] }`
- `fees`: object, `additionalProperties: false`, `required: ["joining","annual"]`, both properties `{ "type": "number" }`
- `rewards`: object, `additionalProperties: false`, `required: ["base_rate"]`; `base_rate` is string; `categories` is an optional array of objects with `additionalProperties: false`, `required: ["merchant","rate"]`, `merchant`/`rate` strings, `cap` nullable string
- `eligibility`: object, `additionalProperties: false`, `required: ["min_age","min_monthly_income"]`; `min_age`/`min_monthly_income` nullable numbers; `notes` nullable string (not required)
- `perks`: `{ "type": "array", "items": { "type": "string" } }`
- `source`: `{ "type": "string", "minLength": 1 }`
- `last_verified`: `{ "type": "string", "pattern": "^\\d{4}-\\d{2}-\\d{2}$" }`

- [ ] **Step 3: Create `data/cards/amazon-pay-icici.yaml`**

Exact content from HANDOFF.md section 6.

- [ ] **Step 4: Create `data/cards/TEMPLATE.yaml`**

All required fields with empty/null placeholder values and inline YAML comments explaining each. `perks: []`, all nullable fields as `null`.

- [ ] **Step 5: Commit**

```bash
git add data/ package.json
git commit -m "feat: add card schema, seed card, and template"
```

---

### Task 2: Validator — `scripts/validate.js` + tests

**Files:**
- Create: `scripts/validate.js`
- Create: `scripts/validate.test.js`
- Modify: `package.json` (root) — add `js-yaml`, `ajv` to `dependencies`; add `validate` and `test:validate` to `scripts`

**Interfaces:**
- Consumes: `data/schema.json` (default schema path), `data/cards/*.yaml` (default cards dir)
- Produces:
  - `export function validateCards(cardsDir: string, schemaPath: string): { valid: boolean, errors: { file: string, field: string, message: string }[] }`
  - CLI runner (default export behaviour): when run as main, calls `validateCards` with default paths, logs errors to stderr, exits 1 on failure, logs `All N card(s) valid.` on success

- [ ] **Step 1: Install dependencies and wire scripts**

```bash
npm install js-yaml ajv
```

Add to root `package.json` `scripts`:
```json
"validate": "node scripts/validate.js",
"test:validate": "node --test scripts/validate.test.js"
```

- [ ] **Step 2: Write the failing tests in `scripts/validate.test.js`**

Each test creates a temp directory with `mkdtempSync(join(tmpdir(), 'cp-'))`, writes fixture YAML files into it, and calls `validateCards(tmpDir, SCHEMA_PATH)` where `SCHEMA_PATH` is the resolved path to `data/schema.json`.

Write these 7 tests:

```javascript
test('valid card passes', ...) 
// fixture: a complete valid card matching the schema
// assert result.valid === true && result.errors.length === 0

test('card missing required name fails', ...)
// fixture: valid card with the name field removed
// assert result.valid === false
// assert result.errors.length >= 1
// assert result.errors[0].file ends with '.yaml'
// assert result.errors[0].message is a non-empty string

test('all errors reported, not fail-fast', ...)
// fixture: card with both name and issuer removed
// assert result.errors.length >= 2

test('perks: null rejected', ...)
// fixture: valid card with `perks: null`
// assert result.valid === false

test('rewards.categories omitted is valid', ...)
// fixture: valid card with the categories key removed from rewards
// assert result.valid === true

test('fees.joining: 0 is valid', ...)
// fixture: valid card with joining: 0 and annual: 0
// assert result.valid === true

test('YAML parse error reported per-file, other files still checked', ...)
// fixture dir: one file with malformed YAML (`name: [unclosed`), one complete valid card
// assert result.errors.some(e => e.file === 'malformed.yaml')
// assert result.valid === false
// assert no error references the valid card's filename
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm run test:validate
```
Expected: all 7 fail (module not found).

- [ ] **Step 4: Implement `validateCards` in `scripts/validate.js`**

Signature: `export function validateCards(cardsDir, schemaPath)` → `{ valid, errors }`.

- Read schema with `readFileSync(schemaPath, 'utf8')` then `JSON.parse`
- `const validate = new Ajv({ allErrors: true }).compile(schema)`
- `readdirSync(cardsDir).filter(f => f.endsWith('.yaml') && f !== 'TEMPLATE.yaml')`
- For each file: `yaml.load(readFileSync(filePath, 'utf8'))` in a try/catch — YAML errors push `{ file, field: '(parse)', message: e.message }` and continue
- For AJV errors: map each to `{ file, field: e.instancePath || '(root)', message: e.message }`
- Return `{ valid: errors.length === 0, errors }`

CLI runner at the bottom of the file — detect main via `import.meta.url === pathToFileURL(process.argv[1]).href` using `node:url`, call `validateCards` with default paths resolved relative to `import.meta.url`, log errors to stderr, exit 1 if any.

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm run test:validate
```
Expected: all 7 pass.

- [ ] **Step 6: Run validate on the seed card**

```bash
npm run validate
```
Expected: `All 1 card(s) valid.`

- [ ] **Step 7: Commit**

```bash
git add scripts/ package.json package-lock.json
git commit -m "feat: add card validator with AJV schema validation"
```

---

### Task 3: Mongoose Card model — `server/models/Card.js`

**Files:**
- Create: `server/models/Card.js`

**Interfaces:**
- Consumes: `mongoose` (already in `server/node_modules`)
- Produces: `default export` — Mongoose model named `'Card'` with `_id: String` (the slug); consumed by Task 4

- [ ] **Step 1: Create `server/models/Card.js`**

Mongoose schema mirroring `data/schema.json`:
- `_id`: `{ type: String }` — overrides Mongoose's ObjectId default; slug is the stable ID
- `name`, `issuer`: `{ type: String, required: true }`
- `network`: `{ type: String, default: null }`
- `fees`: `{ joining: { type: Number, required: true }, annual: { type: Number, required: true } }`
- `rewards`: `{ base_rate: { type: String, required: true }, categories: [{ merchant: String, rate: String, cap: { type: String, default: null } }] }`
- `eligibility`: `{ min_age: { type: Number, default: null }, min_monthly_income: { type: Number, default: null }, notes: { type: String, default: null } }`
- `perks`: `[String]`
- `source`: `{ type: String, required: true }`
- `last_verified`: `{ type: String, required: true }`

Schema options: `{ timestamps: true }`. Export: `mongoose.model('Card', cardSchema)`.

- [ ] **Step 2: Commit**

```bash
git add server/models/Card.js
git commit -m "feat: add Card mongoose model"
```

---

### Task 4: Seed script — `server/scripts/seed.js` + tests

**Files:**
- Create: `server/scripts/seed.js`
- Create: `server/scripts/seed.test.js`
- Modify: `package.json` (root) — add `seed` script

**Interfaces:**
- Consumes:
  - `validateCards` from `../../scripts/validate.js`
  - `Card` default export from `../models/Card.js`
  - `connectDB` default export from `../config/db.js`
  - `MONGO_URI` from `server/.env` via `dotenv.config({ path: join(__dirname, '../.env') })`
- Produces:
  - `export function transformCard(slug: string, cardData: object): object` — returns `{ _id: slug, ...cardData }`
  - CLI runner: validates → aborts if invalid → connects → wipes → reloads → logs `Seeded N card(s)` → disconnects

- [ ] **Step 1: Add `seed` script to root `package.json`**

```json
"seed": "node server/scripts/seed.js"
```

- [ ] **Step 2: Write failing tests in `server/scripts/seed.test.js`**

```javascript
test('transformCard adds slug as _id', ...)
// const result = transformCard('amazon-pay-icici', { name: 'Test' })
// assert.strictEqual(result._id, 'amazon-pay-icici')

test('transformCard does not mutate the original object', ...)
// const original = { name: 'Test' }
// transformCard('slug', original)
// assert.strictEqual(original._id, undefined)

test('transformCard preserves all card fields', ...)
// const card = { name: 'X', issuer: 'Y', perks: ['A'] }
// const result = transformCard('x-y', card)
// assert.strictEqual(result.name, 'X')
// assert.deepStrictEqual(result.perks, ['A'])
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
node --test server/scripts/seed.test.js
```
Expected: fail (module not found).

- [ ] **Step 4: Implement `server/scripts/seed.js`**

Export `transformCard(slug, cardData)` → `{ _id: slug, ...cardData }`.

CLI runner (guarded by `import.meta.url === pathToFileURL(process.argv[1]).href`):
1. Load env: `dotenv.config({ path: join(__dirname, '../.env') })`
2. `const { valid, errors } = validateCards(CARDS_DIR, SCHEMA_PATH)` — paths resolved relative to `import.meta.url`
3. If `!valid`: log each error `file: field — message` to stderr, `process.exit(1)`
4. `await connectDB()`
5. `await Card.deleteMany({})`
6. For each `.yaml` file (excluding `TEMPLATE.yaml`): `yaml.load` → `transformCard(slug, data)` → `Card.create(doc)`
7. Log `Seeded N card(s)` to stdout
8. `await mongoose.disconnect()`

- [ ] **Step 5: Run tests to verify they pass**

```bash
node --test server/scripts/seed.test.js
```
Expected: all 3 pass.

- [ ] **Step 6: Commit**

```bash
git add server/scripts/ package.json
git commit -m "feat: add seed script with validation guard"
```

---

### Task 5: CI workflow — `.github/workflows/validate.yml`

**Files:**
- Create: `.github/workflows/validate.yml`

**Interfaces:**
- Consumes: `npm run validate` (defined in Task 2)
- Produces: GitHub Actions workflow; blocks any PR where `npm run validate` exits non-zero

- [ ] **Step 1: Create `.github/workflows/validate.yml`**

Workflow name: `Validate cards`. Trigger: `on: [pull_request, push]`. Single job `validate` on `ubuntu-latest`. Steps:
1. `actions/checkout@v4`
2. `actions/setup-node@v4` with `node-version: '18'` and `cache: 'npm'`
3. `npm install`
4. `npm run validate`

- [ ] **Step 2: Commit**

```bash
git add .github/
git commit -m "ci: add card validation workflow"
```

---

### Task 6: Extractor prompt — `docs/extractor-prompt.md`

**Files:**
- Create: `docs/extractor-prompt.md`

- [ ] **Step 1: Create `docs/extractor-prompt.md`**

Four sections in this order:
1. **Task** — one sentence: "Extract the credit card data below into a YAML file matching the schema."
2. **Rules** — the null rule (output `null` for any field not explicitly stated in the pasted text — never guess, never infer); slug rule (lowercase, hyphen-separated: `issuer-card-name`)
3. **Schema** — the full YAML representation of every field, with type annotations as inline comments (copy the schema block from the HANDOFF.md)
4. **Input** — a clearly marked placeholder block: `[PASTE THE CARD PAGE TEXT HERE]`
5. **Output instruction** — return only the YAML block, no explanation, no markdown fences

- [ ] **Step 2: Commit**

```bash
git add docs/extractor-prompt.md
git commit -m "docs: add AI extractor prompt"
```

---

### Task 7: Contributor guide — `CONTRIBUTING.md`

**Files:**
- Create: `CONTRIBUTING.md`

- [ ] **Step 1: Create `CONTRIBUTING.md`**

Sections:
1. **Prerequisites** — Node 18+, npm 9+, a real browser (no headless tools)
2. **Setup** — clone, `npm install`, `npm run install:all`, `cp server/.env.example server/.env`
3. **Adding a card** — the full 7-step flow (ACQUIRE → EXTRACT → VERIFY → VALIDATE → COMMIT → CI/REVIEW → SEED) with one paragraph per step; step 2 references `docs/extractor-prompt.md`; step 5 gives the exact command `npm run validate`
4. **PR guidelines** — one `.yaml` file per PR; slug naming (`issuer-card-name` lowercase hyphenated); PR title `Add: <Card Name>`; source URL is required and must be the official bank page
5. **What maintainers check** — source URL opens the right official page, fees and rates match, no fields look invented

- [ ] **Step 2: Commit**

```bash
git add CONTRIBUTING.md
git commit -m "docs: add contributor guide"
```
