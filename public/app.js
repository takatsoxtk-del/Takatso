const products = [
  { id: 'classic-8x10', name: 'Classic 8×10 Print', size: '8×10 in', price: 24000, description: 'A crisp, high-definition print for treasured moments.', imageClass: 'product-one' },
  { id: 'gallery-12x18', name: 'Gallery 12×18 Print', size: '12×18 in', price: 39000, description: 'A statement-size print for portraits and wall displays.', imageClass: 'product-two' },
  { id: 'framed-16x20', name: 'Premium 16×20 Framed', size: '16×20 in', price: 69000, description: 'A beautifully framed keepsake, ready to display.', imageClass: 'product-three' },
  { id: 'family-collage', name: 'Family Collage Set', size: 'Set of 4 prints', price: 89000, description: 'A curated set for milestones, celebrations, and family memories.', imageClass: 'product-four' },
];
const currency = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });
const cartKey = 'takatso-cart';
const productGrid = document.getElementById('productGrid');
const cartItems = document.getElementById('cartItems');
const formMessage = document.getElementById('formMessage');

function getCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(cartKey) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => products.some((product) => product.id === item.id) && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 20) : [];
  } catch {
    return [];
  }
}
function saveCart(cart) { localStorage.setItem(cartKey, JSON.stringify(cart)); }
function money(cents) { return currency.format(cents / 100); }
function addToCart(id) {
  const cart = getCart();
  const item = cart.find((entry) => entry.id === id);
  if (item) item.quantity = Math.min(item.quantity + 1, 20);
  else cart.push({ id, quantity: 1 });
  saveCart(cart); render();
}
function changeQuantity(id, amount) {
  const cart = getCart();
  const item = cart.find((entry) => entry.id === id);
  if (!item) return;
  item.quantity += amount;
  saveCart(cart.filter((entry) => entry.quantity > 0));
  render();
}
function renderProducts() {
  productGrid.innerHTML = products.map((product) => `
    <article class="product-card">
      <div class="product-photo ${product.imageClass}" role="img" aria-label="${product.name}"></div>
      <div class="product-info"><div class="product-topline"><h3>${product.name}</h3><span class="product-price">${money(product.price)}</span></div>
      <p class="product-size">${product.size}</p><p class="product-description">${product.description}</p>
      <button class="add-btn" data-id="${product.id}" type="button">Add to cart</button></div>
    </article>`).join('');
  productGrid.querySelectorAll('.add-btn').forEach((button) => button.addEventListener('click', () => addToCart(button.dataset.id)));
}
function renderCart() {
  const cart = getCart();
  const entries = cart.map((entry) => ({ ...products.find((product) => product.id === entry.id), quantity: entry.quantity }));
  const subtotal = entries.reduce((sum, entry) => sum + entry.price * entry.quantity, 0);
  const delivery = entries.length ? 9500 : 0;
  document.getElementById('cartCount').textContent = String(entries.reduce((sum, entry) => sum + entry.quantity, 0));
  document.getElementById('subtotalValue').textContent = money(subtotal);
  document.getElementById('shippingValue').textContent = money(delivery);
  document.getElementById('totalValue').textContent = money(subtotal + delivery);
  document.getElementById('cartTotalLabel').textContent = money(subtotal + delivery);
  if (!entries.length) {
    cartItems.innerHTML = '<p class="empty-cart">Your cart is empty. Choose a print to get started.</p>';
    return;
  }
  cartItems.innerHTML = entries.map((entry) => `
    <div class="cart-item"><div><h3>${entry.name}</h3><p>${entry.size}</p></div>
    <div class="cart-quantity"><button type="button" data-action="minus" data-id="${entry.id}" aria-label="Remove one ${entry.name}">−</button><span>${entry.quantity}</span><button type="button" data-action="plus" data-id="${entry.id}" aria-label="Add one ${entry.name}">+</button></div>
    <strong>${money(entry.price * entry.quantity)}</strong></div>`).join('');
  cartItems.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => changeQuantity(button.dataset.id, button.dataset.action === 'plus' ? 1 : -1)));
}
function render() { renderProducts(); renderCart(); }

document.getElementById('checkoutForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const cart = getCart();
  if (!cart.length) {
    formMessage.textContent = 'Add at least one print to your cart before checkout.';
    formMessage.className = 'form-message error';
    return;
  }
  const button = document.getElementById('checkoutButton');
  button.disabled = true;
  button.textContent = 'Connecting to secure checkout…';
  formMessage.textContent = '';
  try {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: document.getElementById('customerName').value.trim(),
        email: document.getElementById('customerEmail').value.trim(),
        address: document.getElementById('customerAddress').value.trim(),
        items: cart.map(({ id, quantity }) => ({ id, quantity })),
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Unable to start checkout.');
    window.location.assign(result.authorizationUrl);
  } catch (error) {
    formMessage.textContent = error.message;
    formMessage.className = 'form-message error';
    button.disabled = false;
    button.textContent = 'Continue to secure payment';
  }
});

document.getElementById('cartButton').addEventListener('click', () => document.getElementById('checkout').scrollIntoView({ behavior: 'smooth' }));

const payment = new URLSearchParams(window.location.search).get('payment');
if (payment === 'success') {
  localStorage.removeItem(cartKey);
  window.history.replaceState({}, '', window.location.pathname);
  formMessage.textContent = 'Payment confirmed. Thank you for your order! Takatso will contact you about delivery.';
  formMessage.className = 'form-message success';
} else if (payment === 'failed') {
  window.history.replaceState({}, '', window.location.pathname);
  formMessage.textContent = 'We could not confirm that payment. Your cart is still saved; please try again or contact the store.';
  formMessage.className = 'form-message error';
}
render();
