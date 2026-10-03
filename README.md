# TradeQuote

Canadian trades quotes & invoices SaaS.

**Live:** https://tradequote.faitle.net

## Setup

1. Deploy on Vercel (this repo is connected)
2. Env vars:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PRICE_MONTHLY` = `price_1Tz7AZBkdCjtxhW0CnKqPlAY`
   - `STRIPE_PRICE_YEARLY` = `price_1Tz7CHBkdCjtxhW0nZBRO8qK`
   - `STRIPE_WEBHOOK_SECRET` (optional, from Stripe Dashboard webhook)

## Stack

Next.js 14, Tailwind, Stripe, jsPDF

## Features

- Quotes & invoices for Canadian trades
- GST/HST presets (ON, QC, BC, Atlantic)
- Interac, deposits, discounts
- Full document history (reopen / duplicate), JSON backup v2 (v1 still importable)
- Share / email the PDF (Web Share API, mailto fallback), Google Calendar link + .ics
- Roofing template (Toiture)
- Accounting export (Pro): QuickBooks Online invoice CSV + Excel CSV with GST/QST columns
- EN / FR
- Stripe Pro ($19/mo or $79/yr; STRIPE_PRICE_MONTHLY must point to the 19 CAD/month price)
