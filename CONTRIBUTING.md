# Contributing to Card-Perks

Card-Perks is an open, community-maintained catalog of Indian credit cards.
Contributions happen through one-file pull requests — one YAML file per card,
reviewed as a diff by a maintainer who checks the data against the official source.

## Prerequisites

- Node.js 18+
- npm 9+
- A real browser (no headless tools — bank sites block automated fetching)

## Setup

```bash
git clone <repo-url>
cd Card-Perks
npm install
npm run install:all
cp server/.env.example server/.env
# edit server/.env and set your MONGO_URI
```

## Adding a card

### Step 1 — ACQUIRE

Open the official bank page for the card in a real browser. Copy all the
relevant text: fees, rewards, eligibility rules, perks. Save the URL — you
will need it for the `source` field.

### Step 2 — EXTRACT

Open `docs/extractor-prompt.md`. Paste the copied page text where it says
`[PASTE THE CARD PAGE TEXT HERE]`, then send the whole prompt to an AI model.
The AI will return a draft YAML file.

### Step 3 — VERIFY

Open the draft YAML and the official bank page side by side. Check every field:

- Fees exact? (check joining fee, annual fee)
- Reward rates and caps exact?
- No perks listed that aren't on the page?
- Source URL is the real official page?

Fix any errors in the YAML by hand. If a field is not stated on the page,
it must be `null` — never guess.

### Step 4 — VALIDATE

Run the validator locally:

```bash
npm run validate
```

Fix any errors it reports (file name + field + message) before continuing.
The validator checks the structure only — it cannot verify that the data is
accurate, which is your job in Step 3.

### Step 5 — COMMIT

Save the file to `data/cards/<slug>.yaml` where the slug is lowercase and
hyphen-separated: e.g. `hdfc-regalia` for the HDFC Regalia Credit Card.

```bash
git add data/cards/<slug>.yaml
git commit -m "Add: <Card Name>"
```

One file per PR. Do not change existing card files in the same PR.

### Step 6 — PR REVIEW

Open a pull request. The CI workflow will run `npm run validate` automatically.
A maintainer will:

- Click the `source` URL and confirm it opens the right official page
- Spot-check that fees and reward rates match the page
- Approve and merge if everything looks right

### Step 7 — SEED

After merge, the card is in the repo. To load it into MongoDB:

```bash
npm run seed
```

This wipes the `cards` collection and reloads all files. It is idempotent —
safe to run multiple times.

## PR guidelines

- **One file per PR** — `data/cards/<slug>.yaml` only
- **Slug naming** — lowercase, hyphen-separated, `product-name-issuer`
  (e.g. `amazon-pay-icici`, `hdfc-regalia`, `sbi-cashback`)
- **PR title** — `Add: <full card name>` (e.g. `Add: HDFC Regalia Credit Card`)
- **Source URL is required** — the PR will not be merged without a working
  official bank page URL in the `source` field

## What maintainers check

1. The `source` URL opens the correct official bank card page
2. `fees.joining` and `fees.annual` match the numbers on that page
3. Reward rates and caps match — no rounding, no paraphrasing
4. No perks in the `perks` list that aren't stated on the page
5. Any `null` fields make sense (data genuinely absent from the source)
