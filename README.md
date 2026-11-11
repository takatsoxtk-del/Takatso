# Takatso

A modern storefront for selling photo prints online.

## What it includes
- Product catalog for photo prints and framed artwork
- Cart with quantity controls
- Checkout form with customer details
- Responsive design for desktop and mobile
- Local cart persistence using browser storage

## Run locally
Open `index.html` directly in a browser, or serve the project locally:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Customize
Edit the product list in `app.js` to change prices, sizes, and product details.

## Next step for real sales
This storefront is ready for frontend sales flow. To accept real payments, connect Stripe Checkout or PayPal in a backend or hosted checkout flow.
