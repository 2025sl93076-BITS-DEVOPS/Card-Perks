# Data Ingestion System — Design

**Status:** Draft, awaiting approval
**Date:** 2026-11-24
**Repo:** Card-Perks (MERN, MIT license)

## Intent & why

Card-Perks is an open, community-maintained catalog of Indian credit cards
(fees, rewards, eligibility, perks). No free public API exists for this data,
and bank websites block automated scraping. So the data must be entered by
**humans using a real browser**, sped up by **AI extraction**, kept honest by
a **schema + CI validation**, and loaded into the app's database by a **seed
script**. This document covers only that ingestion subsystem — not the search
UI or API endpoints.

## Architecture decision: files are the source of truth

The repo is MERN (MongoDB + Express + React + Node). The card data could live
in MongoDB directly, but that would require an admin UI + auth to edit, and
would kill the one-file-PR contribution flow that makes an OSS catalog work.

**Decision:** card data lives as **YAML files in the repo** (the source of
truth, contributed via PR + validated by CI). A **seed script** loads those
files into MongoDB, which the Express API then serves. MongoDB is a derived
runtime cache, rebuilt with one command — never edited by hand.

```
data/cards/*.yaml  ──(npm run seed)──►  MongoDB  ──►  Express API  ──►  React client
   source of truth,                      runtime cache
   PR + CI validated
```

## Goals

- A single authoritative **schema** every card file must conform to.
- A **validator** that checks all card files against the schema with clear,
  file+field-level errors (run locally and in CI).
- A **GitHub Action** that blocks any PR containing a malformed card file.
- A Mongoose **`Card` model** mirroring the schema.
- A **seed script** (`npm run seed`) that validates, then loads all card
  files into MongoDB (wipe + reload; idempotent).
- An **extractor prompt** contributors paste raw page text into.
- A **card template** + 2 real seed cards as worked examples.
- Contributor docs for the copy → extract → verify → PR flow.

## Non-goals

- No scraper / automated fetching of bank sites (deliberately — it breaks).
- No search UI, no API query endpoints (separate later work).
- No admin UI; MongoDB is never hand-edited.
- No bulk import of all ~80 cards now — this makes adding each card cheap;
  seeding the full set happens after the system exists.

## Anti-goals (would make this a failure)

- Data that can't be traced to an official source (every card cites a URL).
- A schema so strict contributors give up, or so loose data turns to mush.
- Any step that requires a machine to get past a bank's bot protection.
- MongoDB and the files drifting apart (seed always rebuilds from files).

## Constraints

- **License:** MIT.
- **Data format:** YAML, one file per card, under `data/cards/`.
- **Stack:** Node ESM (repo uses `"type": "module"`). Server deps already
  include `mongoose`. Add `js-yaml` + `ajv` for parsing/validation.
- **Truth vs structure split:** CI validates *structure* only; a human
  verifies *truth* (correct fees/rewards) at PR review. A machine can never
  assert a fee is correct.

## Approaches considered (data source of truth)

1. **MongoDB as source of truth (rejected).** Native MERN, but contributions
   need an admin UI + auth; no reviewable file PRs, no source-cited diffs —
   loses the OSS advantage.
2. **Automated scraper per bank (rejected earlier).** A spike proved 3 of 4
   bank pages block/break automated fetch; per-bank parsers rot on redesign.
3. **YAML files as source of truth, seeded into Mongo (chosen).** Keeps the
   one-file-PR contribution flow and CI validation, while the MERN app serves
   from MongoDB at runtime. Reconciles the OSS model with the existing stack.

## The ingestion pipeline

```
① ACQUIRE   human copies card page text in a browser (or a PDF's text)
② FEED      paste text + schema into the extractor prompt
③ GENERATE  AI returns a draft YAML card file
④ VERIFY    human checks draft vs source (fees, rates, no invented perks)
⑤ VALIDATE  `npm run validate` / CI checks the file against schema.json
⑥ COMMIT    one-file PR → maintainer confirms source link → merge
⑦ SEED      `npm run seed` loads all files into MongoDB (at deploy/locally)
```

Machine handles structure and tedium; human handles truth.

## Card schema (fields)

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

Unknown values are `null`, never guessed. The `slug` (filename without
`.yaml`) is the stable id used as the MongoDB document key.

## File layout (fits the existing MERN repo)

```
Card-Perks/
  data/
    schema.json                 # JSON Schema the validator enforces
    cards/
      TEMPLATE.yaml             # empty card to copy
      amazon-pay-icici.yaml     # seed example (verified)
      <one more seed>.yaml
  scripts/
    validate.js                 # validates all data/cards/*.yaml vs schema
  server/
    models/Card.js              # Mongoose model mirroring the schema
    scripts/seed.js             # validates + loads files into MongoDB
  .github/
    workflows/validate.yml      # runs validation on every PR
  docs/
    extractor-prompt.md         # the AI extraction prompt
  CONTRIBUTING.md               # the copy→extract→verify→PR flow
```

Root `package.json` gets `validate` and `seed` scripts delegating as needed;
`js-yaml`/`ajv` live where the scripts that need them run.

## Left to the builder

- Exact `validate.js` and `seed.js` error-message wording (must name the
  file + field).
- Validation runs all-at-once, reporting every error in one pass (not
  fail-fast).
- `seed.js` reuses the validator and refuses to load if any file is invalid.
- The second seed card (any card with a clean official page).
