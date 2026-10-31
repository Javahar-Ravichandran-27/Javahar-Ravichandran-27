// Tiny reactive store for the cart and the signed-in user.
import { api, getToken, setToken } from './api.js';

const CART_KEY = 'nt_cart';
const listeners = new Set();

function loadCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; }
}

export const state = { cart: loadCart(), user: null };

function emit() {
  try { localStorage.setItem(CART_KEY, JSON.stringify(state.cart)); } catch { /* ignore */ }
  listeners.forEach((fn) => fn(state));
}
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

const keyOf = (i) => `${i.productId}|${i.size}|${i.color}`;

export function addToCart(product, { size, color, quantity = 1 }) {
  const item = { productId: product.id, slug: product.slug, name: product.name, category: product.category,
    price: product.price, size, color: color.name, hex: color.hex, quantity };
  const existing = state.cart.find((i) => keyOf(i) === keyOf(item));
  if (existing) existing.quantity = Math.min(existing.quantity + quantity, 20);
  else state.cart.push(item);
  emit();
}
export function updateQuantity(key, quantity) {
  const item = state.cart.find((i) => keyOf(i) === key);
  if (!item) return;
  if (quantity <= 0) state.cart = state.cart.filter((i) => i !== item);
  else item.quantity = Math.min(quantity, 20);
  emit();
}
export function clearCart() { state.cart = []; emit(); }
export { keyOf };

export const FREE_SHIPPING = 10000;
export function cartTotals() {
  const subtotal = state.cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING ? 0 : 800;
  const count = state.cart.reduce((s, i) => s + i.quantity, 0);
  return { subtotal, shipping, total: subtotal + shipping, count };
}

export async function loadUser() {
  if (!getToken()) return;
  try { state.user = await api('/auth/me'); } catch { setToken(null); state.user = null; }
  emit();
}
export async function login(email, password) {
  const { token, user } = await api('/auth/login', { method: 'POST', body: { email, password } });
  setToken(token); state.user = user; emit();
}
export async function register(name, email, password) {
  const { token, user } = await api('/auth/register', { method: 'POST', body: { name, email, password } });
  setToken(token); state.user = user; emit();
}
export function logout() { setToken(null); state.user = null; emit(); }
