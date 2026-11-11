# Takatso

A small online storefront for Takatso photo prints, with a shopping cart and server-created Paystack Checkout sessions.

## Run locally

Requires Node.js 18 or later.

```bash
npm install
cp .env.example .env
```

Put your **Paystack test secret key** in `.env`, then run:

```bash
npm start
```

Open `http://localhost:3000`. To receive Paystack callbacks during local testing, expose the local server using a secure tunnel and set `BASE_URL` in `.env` to that public HTTPS URL.

## Before accepting live orders

1. Register and complete verification with a Paystack account that can accept ZAR payments for your business.
2. Start with a test secret key, test the full initialize → checkout → server verification flow, and check the returned transaction in your Paystack dashboard.
3. Set `PAYSTACK_SECRET_KEY` to your live secret key only in the hosting provider's server-side environment settings. Never commit `.env` or put the secret in browser code.
4. Set `BASE_URL` to the public HTTPS address of the deployed app and deploy this Node app to a host that supports server-side Node.js. Static-only hosting (including GitHub Pages) cannot run the payment backend.
5. Confirm product prices, the R95 delivery fee, fulfilment, refund, privacy, and customer-support arrangements before taking payments.

The server calculates prices from its own product catalog and verifies transaction status, amount, and currency with Paystack before showing payment success. This starter does not yet save orders to a durable database, send confirmation emails, or automate fulfilment; add those before relying on it for production operations.
