const express = require('express');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const port = Number(process.env.PORT) || 3000;
const baseUrl = (process.env.BASE_URL || `http://localhost:${port}`).replace(/\/$/, '');
const secretKey = process.env.PAYSTACK_SECRET_KEY;

// Prices are stored as integer cents (ZAR subunits). The server, not the browser,
// is authoritative for product names and prices.
const products = {
  'classic-8x10': { name: 'Classic 8x10 Print', size: '8x10 in', price: 24000 },
  'gallery-12x18': { name: 'Gallery 12x18 Print', size: '12x18 in', price: 39000 },
  'framed-16x20': { name: 'Premium 16x20 Framed', size: '16x20 in', price: 69000 },
  'family-collage': { name: 'Family Collage Set', size: '4 prints', price: 89000 },
};
const shipping = 9500;

app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

app.post('/api/checkout', async (req, res) => {
  if (!secretKey) {
    return res.status(503).json({ error: 'Payments are not configured yet. Add your Paystack secret key on the server.' });
  }

  const { name, email, address, items } = req.body || {};
  if (typeof name !== 'string' || name.trim().length < 1 || name.length > 120 ||
      typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      typeof address !== 'string' || address.trim().length < 5 || address.length > 500 ||
      !Array.isArray(items) || items.length < 1 || items.length > 20) {
    return res.status(400).json({ error: 'Please provide valid contact, delivery, and cart details.' });
  }

  const normalized = [];
  for (const entry of items) {
    const product = products[entry?.id];
    const quantity = Number(entry?.quantity);
    if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      return res.status(400).json({ error: 'The cart contains an invalid product or quantity. Please refresh and try again.' });
    }
    normalized.push({ id: entry.id, name: product.name, quantity, unit_amount: product.price });
  }

  const subtotal = normalized.reduce((sum, item) => sum + item.unit_amount * item.quantity, 0);
  const amount = subtotal + shipping;
  const orderId = crypto.randomUUID();

  try {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.trim(),
        amount,
        currency: 'ZAR',
        callback_url: `${baseUrl}/payment/callback`,
        metadata: {
          order_id: orderId,
          customer_name: name.trim(),
          delivery_address: address.trim(),
          items: normalized,
          expected_amount: amount,
          custom_fields: [
            { display_name: 'Order ID', variable_name: 'order_id', value: orderId },
          ],
        },
      }),
    });
    const result = await response.json();
    if (!response.ok || !result.status || !result.data?.authorization_url) {
      console.error('Paystack initialization failed:', result.message || response.status);
      return res.status(502).json({ error: 'Could not start payment. Please try again or contact the store.' });
    }
    return res.json({ authorizationUrl: result.data.authorization_url });
  } catch (error) {
    console.error('Paystack request failed:', error.message);
    return res.status(502).json({ error: 'Payment service is unavailable. Please try again shortly.' });
  }
});

app.get('/payment/callback', async (req, res) => {
  const reference = typeof req.query.reference === 'string' ? req.query.reference : '';
  if (!secretKey || !reference || reference.length > 200) {
    return res.redirect('/?payment=failed');
  }

  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const result = await response.json();
    const transaction = result.data;
    const expectedAmount = Number(transaction?.metadata?.expected_amount);
    const isVerified = response.ok && result.status && transaction?.status === 'success' &&
      transaction.currency === 'ZAR' && Number.isInteger(expectedAmount) && transaction.amount === expectedAmount;

    if (!isVerified) return res.redirect('/?payment=failed');
    return res.redirect('/?payment=success');
  } catch (error) {
    console.error('Paystack verification failed:', error.message);
    return res.redirect('/?payment=failed');
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(port, () => {
  console.log(`Takatso storefront listening at ${baseUrl}`);
});
