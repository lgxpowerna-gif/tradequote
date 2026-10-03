# TradeQuote

Canadian trades quotes & invoices SaaS.

**Live:** https://tradequote.faitle.net

## Setup

1. Deploy on Vercel (this repo is connected)
2. Env vars:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PRICE_MONTHLY` = `price_1UMXUSBkdCjtxhW0DKEYSi1S` (19 CAD/month, since 2026-10-03; old 9 CAD price `price_1U3KDnBkdCjtxhW0Ekgw3E1l` kept active for existing subscribers)
   - `STRIPE_PRICE_YEARLY` = `price_1UMXTgBkdCjtxhW05caAAI34` (190 CAD/year; old 79 CAD price `price_1U3K9tBkdCjtxhW04q246AgR` kept active)
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
- Stripe Pro ($19/mo or $190/yr). Pro is granted from subscription status + metadata.app, not from the price id, so subscriptions on the old prices stay valid.
