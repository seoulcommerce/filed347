# Filed347

Weekly certified payroll. From a CSV.

WH-347 for public-works subcontractors. You already have the payroll file. Software builds the form. No human queue.

**$69/mo when checkout is live.** Stripe is off. Not Knowify. Not a lawyer. Not a legal opinion. We do not say you are compliant. You review, mark leftover boxes, sign, and file.

## What it does

Upload a Gusto / QBO / ADP-ish weekly payroll CSV plus the project fields you already have. Filed347 prints a WH-347 payroll table and the official Statement of Compliance wording. Certification boxes are printed as text and are **not** marked. Prime / sub and final-payroll boxes are marked from your form. Signature lines stay blank. Wage determination is printed only as you pasted it.

See [COLUMN-MAPPING.md](COLUMN-MAPPING.md) for header → field mapping.

## Local tests (no charge)

```
node scripts/test-form.js
node scripts/test-exports.js
```

Writes `test-wh347.pdf` from `sample.csv`, plus `test-gusto-wh347.pdf` and `test-qbo-adp-wh347.pdf` from `fixtures/`. SAMPLE workers only. Does not call Stripe.

Sample packet (also on the landing, above the form):

- `/sample-wh347.pdf`
- `/sample.csv`

## Preview without Stripe

`POST /api/pdf` with form + csv returns a PDF. No live keys required. No `stripe_not_live` for preview.

`GET /api/pdf?sample=1` returns the sample PDF.

`POST /api/form` saves the parsed form + PDF (memory + `/tmp/filed347/{id}` for **24 hours**) and returns `{id}`. Raw CSV is stripped from the stored JSON.

`GET /api/pdf?id=...` downloads that stored PDF. `thanks.html` uses this path. sessionStorage is a fallback only.

## Stripe keys (Vercel) — do not enable yet

Leave env empty. Checkout stays `live: false`. In the Vercel project **filed347** (team **seoulweb**), paste live keys only when CoS says so:

- `STRIPE_SECRET_KEY` — must start with `sk_live_`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — must start with `pk_live_`

`/api/status` reports `live: true` only when both prefixes match. The generate/preview button stays enabled either way. Subscribe stays disabled until live.

## Privacy

Last 4 only. We drop 9-digit SSN-shaped cells. CSV is not kept as a payroll archive. Generated PDF TTL is 24 hours. See `/privacy` and `/terms`. Company name: Filed347. We do not accept payroll CSVs by email.

## Not legal advice

This is software that fills a form from your file. It is not a compliance guarantee and not a lawyer. We do not file for you.
