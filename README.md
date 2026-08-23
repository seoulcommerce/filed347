# Filed347

Weekly certified payroll. From a CSV.

Software generates a WH-347. You review it, mark the boxes, sign it, and file it. Stripe is off. No charge can be made.

**Not Knowify. Not a lawyer.** Not a legal opinion. We do not say you are compliant.

## Samples

- [Sample WH-347 (PDF)](sample-wh347.pdf)
- [Sample payroll CSV](sample.csv)

Do not invent a second sample. Column aliases for Gusto and QBO/ADP-ish weekly exports are in [COLUMN-MAPPING.md](COLUMN-MAPPING.md).

## What it does

Upload a weekly payroll CSV plus the project fields you already have. Filed347 prints a WH-347 payroll table and the Statement of Compliance wording. Certification boxes are printed as text and are **not** marked. Signature lines stay blank. Wage determination is printed only as you pasted it. Prime / sub / final payroll boxes are marked from fields you set.

The CSV is read in the browser. The server sees it only in the request that builds the PDF. That request is not written to a payroll database or a disk folder. After that request ends, we do not keep the CSV. A short download id may hold **PDF bytes only**.

## Local test (no charge)

```
node scripts/test-form.js && node scripts/test-exports.js
```

Writes `test-wh347.pdf` from `sample.csv`, plus `test-gusto-wh347.pdf` and `test-qbo-adp-wh347.pdf` from `fixtures/`. SAMPLE workers only. Last-4 only. Does not call Stripe.

## Stripe keys (Vercel)

Checkout stays off until live keys are on the Vercel project **filed347** (team **seoulweb**):

- `STRIPE_SECRET_KEY` — must start with `sk_live_`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — must start with `pk_live_`

`/api/status` reports `live: true` only when both prefixes match. `/api/pdf` generates without Stripe. Do not paste test keys.

## Not legal advice

This is software that fills a form from your file. It is not a compliance guarantee and not a lawyer.
