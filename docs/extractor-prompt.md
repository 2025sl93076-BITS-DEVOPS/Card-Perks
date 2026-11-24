# Card Data Extractor Prompt

## Task

Extract the credit card data below into a YAML file matching the schema.

## Rules

1. **Output `null` for any nullable field not explicitly stated in the pasted text — never guess, never infer.**
   Nullable fields are: `network`, `rewards.categories[*].cap`, `eligibility.min_age`, `eligibility.min_monthly_income`, `eligibility.notes`.
   **Fees are always required numbers** (`joining`, `annual`). Use `0` if the card is confirmed free, or the exact number stated. If a fee is genuinely absent from the page, note it in `eligibility.notes` for the reviewer rather than guessing.
2. The `perks` list must contain only benefits explicitly stated on the official page — no paraphrasing, no additions.
3. The slug (output filename, without `.yaml`) must be lowercase and hyphen-separated: `product-name-issuer`.
   Example: "Amazon Pay ICICI Bank Credit Card" → `amazon-pay-icici`.
4. `source` must be the exact URL of the official bank page you copied the text from.
5. `last_verified` must be today's date in `YYYY-MM-DD` format.

## Schema

```yaml
name:            string        # required — full card name as printed
issuer:          string        # required — bank name
network:         string|null   # Visa / Mastercard / RuPay / Amex; null if unspecified
fees:
  joining:       number        # INR, no symbols; 0 means free; always required
  annual:        number        # INR; always required
rewards:
  base_rate:     string        # required — e.g. "1% on all spends"
  categories:                  # optional — omit block if no category-specific rates
    - merchant:  string        # e.g. "Amazon"
      rate:      string        # e.g. "5%"
      cap:       string|null   # e.g. "₹1000/cycle" or null
eligibility:
  min_age:            number|null   # null if not stated
  min_monthly_income: number|null   # INR; null if not stated
  notes:              string|null   # any other eligibility condition; null if none
perks:           [string]      # list only perks explicitly on the page; [] if none
source:          string        # required — official URL
last_verified:   string        # required — YYYY-MM-DD
```

## Input

[PASTE THE CARD PAGE TEXT HERE]

## Output

Return only the YAML block below — no explanation, no markdown fences, no extra text.

slug: [issuer-card-name]

---
[yaml content here]
