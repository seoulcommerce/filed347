# Filed347

Weekly certified payroll. From a CSV.

WH-347 for public-works subcontractors. You already have the payroll file. Software builds the form. No human queue.

**$69/mo.** Not Knowify. Not a lawyer. Not a legal opinion. We do not say you are compliant. You review and sign.

## What it does

Upload a Gusto/QBO-ish weekly payroll CSV plus the project fields you already have. Filed347 prints a WH-347 payroll table and the official Statement of Compliance wording. Certification boxes are printed as text and are **not** marked. Signature lines stay blank. Wage determination is printed only as you pasted it.

## Local test (no charge)

```
node scripts/test-form.js
```

Writes `test-wh347.pdf` from `sample.csv` (SAMPLE workers, SAMPLE County Culvert — not a real job, SAMPLE WD). Does not call Stripe.

## Stripe keys (Vercel)

In the Vercel project **filed347** (team **seoulweb**), paste live keys only:

- `STRIPE_SECRET_KEY` — must start with `sk_live_`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — must start with `pk_live_`

Then Redeploy. `/api/status` reports `live: true` only when both prefixes match. Checkout will not create a session until then. Do not paste test keys.

## Not legal advice

This is software that fills a form from your file. It is not a compliance guarantee and not a lawyer.
