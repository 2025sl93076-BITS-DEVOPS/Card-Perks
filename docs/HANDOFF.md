# Card-Perks — Handoff Brief for Claude Code

> **Read this first.** It gives a fresh Claude Code session everything it
> needs to continue the data-ingestion work with no prior conversation.
> Pair it with the full design doc at
> `docs/superpowers/specs/2026-11-24-data-ingestion-design.md`.

---

## 1. What this project is

**Card-Perks** is an open-source, community-maintained catalog of Indian
credit cards — their fees, rewards, eligibility, and perks — so a normal
consumer can find card benefits and eligibility in one place. MIT licensed.
Built by a 3-person team.

## 2. The core problem it solves (read this — it drives every decision)

There is **no free public API** for Indian credit-card data, and bank
websites **block automated scraping** (bot protection, JS-rendered pages,
redirects — verified by a spike: 3 of 4 bank pages failed automated fetch).

**Therefore the data is gathered by humans, structured by AI, and verified by
humans.** This is not a limitation to engineer around — it IS the
architecture. Do not build a scraper.

## 3. Architecture (locked decisions — do not relitigate)

- **Stack:** MERN (MongoDB + Express + React + Node). Already scaffolded in
  this repo (`client/` = Vite+React, `server/` = Express+Mongoose).
- **Source of truth = YAML files in the repo**, one per card, under
  `data/cards/`. Contributions happen via **one-file pull requests** so they
  are reviewable as a diff. This PR flow is the project's whole OSS advantage.
- **MongoDB is a derived runtime cache**, rebuilt from the files by a seed
  script. **Never hand-edit MongoDB** — edit a `.yaml` file and re-run seed,
  or your change is lost on the next seed.

```
data/cards/*.yaml  ──(npm run seed)──►  MongoDB  ──►  Express API  ──►  React client
   source of truth,                      runtime cache
   PR + CI validated
```

## 4. The ingestion pipeline (how a card gets added)

```
① ACQUIRE   a human copies the card's text from the official bank page in a
            real browser (or copies a T&C PDF's text)
② FEED      paste that text + the schema into docs/extractor-prompt.md
③ GENERATE  the AI returns a draft YAML card file
④ VERIFY    the human checks the draft against the source: fees exact?
            reward rates/caps exact? no invented perks? real source URL?
⑤ VALIDATE  `npm run validate` checks the file against data/schema.json
⑥ COMMIT    one-file PR → maintainer confirms the source link → merge
⑦ SEED      `npm run seed` loads all files into MongoDB
```

**Rule that prevents hallucinated data:** the extractor must output `null`
for any field not explicitly stated in the source — never guess.

## 5. Card schema (the contract everything depends on)

```yaml
name:            string        # required
issuer:          string        # required
network:         string|null   # Visa / Mastercard / RuPay / Amex
fees:
  joining:       number        # INR, no symbols; 0 means free
  annual:        number        # INR
rewards:
  base_rate:     string        # e.g. "1% on all spends"
  categories:                  # optional list
    - merchant:  string        # e.g. "Amazon"
      rate:      string        # e.g. "5%"
      cap:       string|null   # e.g. "₹1000/cycle" or null
eligibility:
  min_age:            number|null
  min_monthly_income: number|null   # INR
  notes:              string|null
perks:             [string]    # list; only perks stated on the page
source:            string      # official URL the data came from (required)
last_verified:     string      # YYYY-MM-DD (required)
```

The filename (slug, e.g. `amazon-pay-icici`) is the stable id used as the
MongoDB document key.

## 6. One real card already extracted (use as the first seed + sanity check)

```yaml
# data/cards/amazon-pay-icici.yaml
name: Amazon Pay ICICI Bank Credit Card
issuer: ICICI Bank
network: Visa
fees:
  joining: 0
  annual: 0
rewards:
  base_rate: "1% unlimited on all spends"
  categories:
    - merchant: "Amazon (Prime members)"
      rate: "5%"
      cap: null
    - merchant: "Amazon (non-Prime)"
      rate: "3%"
      cap: null
    - merchant: "Amazon Pay partner sites"
      rate: "2%"
      cap: null
eligibility:
  min_age: 21
  min_monthly_income: 30000
  notes: "Indian citizen; invite-only program"
perks:
  - "1% fuel surcharge waiver"
  - "1.99% forex markup"
  - "No-cost EMI on eligible Amazon purchases"
  - "Add-on cards available"
source: "https://www.icici.bank.in/personal-banking/cards/credit-card/amazon-pay-credit-card"
last_verified: "2026-11-24"
```

## 7. What to build (the data ingestion system — additive, rewrites nothing)

| File | Responsibility |
|------|---------------|
| `data/schema.json` | JSON Schema the validator enforces |
| `data/cards/TEMPLATE.yaml` | empty card to copy |
| `data/cards/amazon-pay-icici.yaml` | first seed (section 6) |
| `data/cards/<one-more>.yaml` | second seed, any card with a clean official page |
| `scripts/validate.js` | validate ALL card files vs schema; report every error (file + field), not fail-fast |
| `server/models/Card.js` | Mongoose model mirroring the schema (alongside existing `Example.js`) |
| `server/scripts/seed.js` | reuse the validator; refuse to seed if any file invalid; wipe + reload Mongo (idempotent) |
| `.github/workflows/validate.yml` | run validation on every PR |
| `docs/extractor-prompt.md` | the AI extraction prompt (section 4 rules) |
| `CONTRIBUTING.md` | the copy→extract→verify→PR flow for contributors |

Root `package.json` gains `validate` and `seed` scripts. Add `js-yaml` +
`ajv` where the scripts run. Repo uses ESM (`"type": "module"`).

## 8. How to proceed (recommended workflow)

1. If you have the Superpowers skills available, use **writing-plans** to
   turn section 7 into a TDD, task-by-task plan, then **executing-plans** (or
   subagent-driven-development) to build it. Otherwise, build section 7
   directly, test-first.
2. Build order: schema.json → validate.js (+ tests) → TEMPLATE + seed cards →
   Card model → seed.js (+ tests) → CI workflow → extractor-prompt.md →
   CONTRIBUTING.md.
3. Test-first for `validate.js` and `seed.js`: write a failing test with a
   deliberately broken card file, confirm it fails, then implement.
4. Verify before claiming done: `npm run validate` passes on the seed cards,
   and (with a local/Atlas MongoDB in `server/.env`) `npm run seed` loads
   them.

## 9. Out of scope for now (don't build yet)

Search UI, API query endpoints, the "which card should I use / get"
recommender, and any AI-powered natural-language search. Those are later
projects that READ the data this system produces.
