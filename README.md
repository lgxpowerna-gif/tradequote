# TradeQuote

Canadian trades quotes & invoices SaaS.

**Live:** https://tradequote-beta.vercel.app

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
- EN / FR
- Stripe Pro ($9/mo or $79/yr)
