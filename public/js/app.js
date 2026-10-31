import { api } from './api.js';
import { productVisual, garmentSVG } from './garment.js';
import {
  state, subscribe, addToCart, updateQuantity, clearCart, keyOf, cartTotals, FREE_SHIPPING,
  loadUser, login, register, logout,
} from './store.js';

const app = document.getElementById('app');
const $ = (sel, root = document) => root.querySelector(sel);

// ---------- helpers ----------
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (cents) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
const date = (s) => new Date(s.replace(' ', 'T') + 'Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const CATEGORY_LABELS = { tees: 'Tees', hoodies: 'Hoodies & Sweats', outerwear: 'Outerwear', bottoms: 'Bottoms', dresses: 'Dresses', accessories: 'Accessories' };
const label = (c) => CATEGORY_LABELS[c] || c;

let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

function priceHTML(p) {
  return p.compare_at && p.compare_at > p.price
    ? `<span class="price"><s>${money(p.compare_at)}</s>${money(p.price)}</span>`
    : `<span class="price">${money(p.price)}</span>`;
}

function productCard(p) {
  const sale = p.compare_at && p.compare_at > p.price;
  return `<article class="card fade-in">
    <a href="/product/${esc(p.slug)}" data-link class="card-media">
      <div class="badges">${p.is_new ? '<span class="badge">New</span>' : ''}${sale ? '<span class="badge sale">Sale</span>' : ''}${p.stock === 0 ? '<span class="badge">Sold out</span>' : ''}</div>
      ${productVisual(p)}
    </a>
    ${p.stock > 0 ? `<button class="btn btn-sm quick-add" data-action="quick-add" data-slug="${esc(p.slug)}">Quick add</button>` : ''}
    <div class="card-info">
      <div><h3><a href="/product/${esc(p.slug)}" data-link>${esc(p.name)}</a></h3>
        <small class="muted">${p.colors.length} color${p.colors.length > 1 ? 's' : ''}</small></div>
      ${priceHTML(p)}
    </div>
    <div class="dots">${p.colors.map((c) => `<span class="dot" style="background:${esc(c.hex)}" title="${esc(c.name)}"></span>`).join('')}</div>
  </article>`;
}

const skeletonGrid = (n = 8) => `<div class="grid">${'<div class="skeleton"></div>'.repeat(n)}</div>`;

// ---------- views ----------
async function homeView() {
  app.innerHTML = `
  <section class="hero container">
    <div class="hero-grid">
      <div class="fade-in">
        <span class="eyebrow">Autumn / Winter 2026 Collection</span>
        <h1>Made to be <em class="italic">lived</em> in.</h1>
        <p class="lead">Modern essentials cut from organic cotton, recycled fibres and merino — designed in small batches to be worn for years, not seasons.</p>
        <div class="hero-cta">
          <a href="/shop" data-link class="btn">Shop the collection</a>
          <a href="/shop?new=true" data-link class="btn btn-ghost">New arrivals</a>
        </div>
        <div class="hero-stats">
          <div><strong>100%</strong><span>Organic & recycled fibres</span></div>
          <div><strong>4.9★</strong><span>From 12k+ reviews</span></div>
          <div><strong>30 days</strong><span>Free returns</span></div>
        </div>
      </div>
      <div class="hero-art" aria-hidden="true">
        <div class="hero-card c1">${garmentSVG({ slug: 'hoodie', category: 'hoodies', name: '' }, '#b98d6a')}</div>
        <div class="hero-card c2">${garmentSVG({ slug: 'jacket', category: 'outerwear', name: '' }, '#5c6040')}</div>
        <div class="hero-card c3">${garmentSVG({ slug: 'beanie', name: '' }, '#c0785a')}</div>
        <div class="hero-tag"><i></i> New drop — live now</div>
      </div>
    </div>
  </section>
  <div class="marquee" aria-hidden="true"><div class="marquee-track">
    ${['Organic cotton', 'Small batch', 'Designed to last', 'Carbon-neutral shipping', 'Fair wages', 'Free returns'].concat(['Organic cotton', 'Small batch', 'Designed to last', 'Carbon-neutral shipping', 'Fair wages', 'Free returns']).map((t) => `<span>${t}</span>`).join('')}
  </div></div>
  <section class="section container">
    <div class="section-head"><div><span class="eyebrow">Browse</span><h2>Shop by category</h2></div></div>
    <div class="cats" id="cats">${'<div class="skeleton" style="aspect-ratio:1"></div>'.repeat(6)}</div>
  </section>
  <section class="section container" style="padding-top:0">
    <div class="section-head"><div><span class="eyebrow">Most loved</span><h2>The essentials edit</h2></div>
      <a href="/shop" data-link class="btn btn-ghost btn-sm">View all</a></div>
    <div id="featured">${skeletonGrid(4)}</div>
  </section>
  <section class="container">
    <div class="feature">
      <div class="feature-art">${garmentSVG({ slug: 'jacket', category: 'outerwear', name: 'Utility Chore Jacket' }, '#c0785a')}</div>
      <div class="feature-copy">
        <span class="eyebrow">The outerwear edit</span>
        <h2>Layers that get better with every wear.</h2>
        <p>Heavy cotton twill, corozo buttons and triple-stitched seams. Our chore jacket is built to soften, fade and tell your story.</p>
        <a href="/shop?category=outerwear" data-link class="btn">Shop outerwear</a>
      </div>
    </div>
  </section>
  <section class="section container">
    <div class="section-head"><div><span class="eyebrow">Just landed</span><h2>New arrivals</h2></div>
      <a href="/shop?new=true" data-link class="btn btn-ghost btn-sm">Shop new</a></div>
    <div id="new">${skeletonGrid(4)}</div>
  </section>
  <section class="section container" style="padding-top:0">
    <div class="values">
      <div class="value"><div class="num">01</div><h3>Better materials</h3><p class="muted">Certified organic cotton, recycled nylon and traceable merino. No compromises on what touches your skin.</p></div>
      <div class="value"><div class="num">02</div><h3>Made fairly</h3><p class="muted">We partner with three family-run factories we visit every season, paying living wages across our supply chain.</p></div>
      <div class="value"><div class="num">03</div><h3>Built to last</h3><p class="muted">Every piece is wear-tested for 100+ washes. If it fails early, we'll repair or replace it — free.</p></div>
    </div>
  </section>
  <section class="section container quote">
    <blockquote>“The hoodie I reach for every single morning. Two years in and it still looks brand new.”</blockquote>
    <span class="muted">— Priya S., verified customer</span>
  </section>`;

  const [cats, featured, fresh] = await Promise.all([
    api('/products/categories'), api('/products?featured=true&limit=4'), api('/products?new=true&limit=4'),
  ]);
  const sampleBy = {};
  (await api('/products?limit=100')).forEach((p) => { sampleBy[p.category] ||= p; });
  $('#cats').innerHTML = cats.map((c) => `<a class="cat fade-in" href="/shop?category=${esc(c.name)}" data-link>
      ${sampleBy[c.name] ? garmentSVG(sampleBy[c.name]) : ''}<strong>${esc(label(c.name))}</strong><small>${c.count} styles</small></a>`).join('');
  $('#featured').innerHTML = `<div class="grid">${featured.map(productCard).join('')}</div>`;
  $('#new').innerHTML = `<div class="grid">${fresh.map(productCard).join('')}</div>`;
}

async function shopView(params) {
  const category = params.get('category') || '';
  const gender = params.get('gender') || '';
  const q = params.get('q') || '';
  const sort = params.get('sort') || 'featured';
  const title = q ? `Results for “${q}”` : params.get('sale') ? 'Sale' : params.get('new') ? 'New arrivals'
    : category ? label(category) : gender ? `Shop ${gender}` : 'Shop all';

  app.innerHTML = `<div class="container">
    <div class="page-head"><span class="eyebrow">Nova Threads</span><h1>${esc(title)}</h1></div>
    <div class="shop">
      <aside class="filters" id="filters"></aside>
      <div>
        <div class="toolbar"><span class="muted" id="count">Loading…</span>
          <select class="select" id="sort" aria-label="Sort products">
            ${[['featured', 'Featured'], ['newest', 'Newest'], ['price-asc', 'Price: low to high'], ['price-desc', 'Price: high to low'], ['name', 'Name']]
              .map(([v, l]) => `<option value="${v}" ${v === sort ? 'selected' : ''}>${l}</option>`).join('')}
          </select></div>
        <div id="results">${skeletonGrid(6)}</div>
      </div>
    </div></div>`;

  const link = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    const s = next.toString();
    return `/shop${s ? `?${s}` : ''}`;
  };
  $('#sort').addEventListener('change', (e) => navigate(link({ sort: e.target.value }), { replace: true }));

  const [cats, products] = await Promise.all([api('/products/categories'), api(`/products?${params.toString()}`)]);
  $('#filters').innerHTML = `
    <div><h4>Category</h4><div class="filter-list">
      <a class="chip ${!category ? 'active' : ''}" href="${link({ category: '' })}" data-link>All</a>
      ${cats.map((c) => `<a class="chip ${c.name === category ? 'active' : ''}" href="${link({ category: c.name })}" data-link>${esc(label(c.name))}</a>`).join('')}
    </div></div>
    <div><h4>Shop for</h4><div class="filter-list">
      ${[['', 'Everyone'], ['women', 'Women'], ['men', 'Men']].map(([v, l]) => `<a class="chip ${v === gender ? 'active' : ''}" href="${link({ gender: v })}" data-link>${l}</a>`).join('')}
    </div></div>
    <div><h4>Offers</h4><div class="filter-list">
      <a class="chip ${params.get('new') ? 'active' : ''}" href="${link({ new: params.get('new') ? '' : 'true' })}" data-link>New in</a>
      <a class="chip ${params.get('sale') ? 'active' : ''}" href="${link({ sale: params.get('sale') ? '' : 'true' })}" data-link>On sale</a>
    </div></div>`;
  $('#count').textContent = `${products.length} product${products.length === 1 ? '' : 's'}`;
  $('#results').innerHTML = products.length
    ? `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(210px,1fr))">${products.map(productCard).join('')}</div>`
    : `<div class="empty"><h3>Nothing here yet</h3><p class="muted">Try a different filter or search term.</p><a href="/shop" data-link class="btn btn-sm">Clear filters</a></div>`;
}

async function productView(slug) {
  app.innerHTML = `<div class="container pdp"><div class="skeleton" style="aspect-ratio:1/1.1"></div><div></div></div>`;
  let p;
  try { p = await api(`/products/${encodeURIComponent(slug)}`); } catch { return notFoundView(); }
  document.title = `${p.name} — Nova Threads`;
  let color = p.colors[0];
  let size = p.sizes.length === 1 ? p.sizes[0] : null;
  let qty = 1;

  app.innerHTML = `<div class="container">
    <div class="pdp">
      <div class="pdp-media" id="media">${productVisual(p, color.hex)}</div>
      <div class="fade-in">
        <div class="crumbs"><a href="/shop" data-link>Shop</a> / <a href="/shop?category=${esc(p.category)}" data-link>${esc(label(p.category))}</a></div>
        ${p.is_new ? '<span class="badge" style="border:1px solid var(--line)">New arrival</span>' : ''}
        <h1 style="margin-top:.6rem">${esc(p.name)}</h1>
        ${priceHTML(p)}
        <p class="muted">${esc(p.description)}</p>
        <div class="option"><div class="option-label"><span>Color: <strong id="color-name">${esc(color.name)}</strong></span></div>
          <div class="swatches">${p.colors.map((c, i) => `<button class="swatch ${i === 0 ? 'active' : ''}" style="background:${esc(c.hex)}" data-i="${i}" aria-label="${esc(c.name)}"></button>`).join('')}</div></div>
        <div class="option"><div class="option-label"><span>Size</span><button class="link muted" data-action="size-guide">Size guide</button></div>
          <div class="sizes">${p.sizes.map((s) => `<button class="size ${s === size ? 'active' : ''}" data-size="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>
        <div class="buy-row">
          <div class="qty"><button data-q="-1" aria-label="Decrease">−</button><span id="qty">1</span><button data-q="1" aria-label="Increase">+</button></div>
          <button class="btn btn-block" id="add" ${p.stock === 0 ? 'disabled' : ''}>${p.stock === 0 ? 'Sold out' : 'Add to bag'}</button>
        </div>
        ${p.stock > 0 && p.stock < 10 ? `<p class="stock-note">Only ${p.stock} left — order soon.</p>` : ''}
        <div class="perks">
          <div>🚚 Free shipping on orders over ${money(FREE_SHIPPING)}</div>
          <div>↩︎ Free 30-day returns & exchanges</div>
          <div>🌱 Made with certified organic & recycled materials</div>
        </div>
        <details open><summary>Details</summary><p>${esc(p.description)} Designed in-house and produced in small batches.</p></details>
        <details><summary>Fabric & care</summary><p>Machine wash cold, inside out. Tumble dry low or hang to dry. Do not bleach. Warm iron if needed.</p></details>
        <details id="sg"><summary>Size & fit</summary><p>True to size with a relaxed fit. Size down for a closer fit. Model is 6'1" / 185cm and wears size M.</p></details>
      </div>
    </div>
    ${p.related.length ? `<section class="section" style="padding-top:1rem"><div class="section-head"><h2>You may also like</h2></div>
      <div class="grid">${p.related.map(productCard).join('')}</div></section>` : ''}
  </div>`;

  app.querySelectorAll('.swatch').forEach((b) => b.addEventListener('click', () => {
    color = p.colors[Number(b.dataset.i)];
    app.querySelectorAll('.swatch').forEach((x) => x.classList.toggle('active', x === b));
    $('#color-name').textContent = color.name;
    $('#media').innerHTML = productVisual(p, color.hex);
  }));
  app.querySelectorAll('.size').forEach((b) => b.addEventListener('click', () => {
    size = b.dataset.size;
    app.querySelectorAll('.size').forEach((x) => x.classList.toggle('active', x === b));
  }));
  app.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => {
    qty = Math.max(1, Math.min(Math.min(20, p.stock || 1), qty + Number(b.dataset.q)));
    $('#qty').textContent = qty;
  }));
  $('[data-action="size-guide"]').addEventListener('click', () => { $('#sg').open = true; $('#sg').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  $('#add').addEventListener('click', () => {
    if (!size) { toast('Please choose a size'); return; }
    addToCart(p, { size, color, quantity: qty });
    openCart();
  });
}

function checkoutView() {
  if (!state.cart.length) {
    app.innerHTML = `<div class="container narrow" style="text-align:center"><h1>Your bag is empty</h1><p class="muted">Let's find something you'll love.</p><a href="/shop" data-link class="btn">Start shopping</a></div>`;
    return;
  }
  const u = state.user;
  const t = cartTotals();
  app.innerHTML = `<div class="container">
    <div class="page-head"><span class="eyebrow">Secure checkout</span><h1>Checkout</h1></div>
    <div class="checkout">
      <form class="panel form" id="checkout-form" novalidate>
        <h3>Contact</h3>
        ${u ? `<p class="muted" style="margin:0">Signed in as <strong>${esc(u.email)}</strong></p>`
          : `<p class="muted" style="margin:0">Have an account? <a href="/login?next=/checkout" data-link class="link">Sign in</a> to track your order.</p>`}
        <div class="form-row">
          <div class="field"><label for="name">Full name</label><input id="name" name="name" required autocomplete="name" value="${esc(u?.name)}"></div>
          <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" required autocomplete="email" value="${esc(u?.email)}"></div>
        </div>
        <h3 style="margin-top:1rem">Shipping address</h3>
        <div class="field"><label for="line1">Address</label><input id="line1" name="line1" required autocomplete="address-line1"></div>
        <div class="field"><label for="line2">Apartment, suite (optional)</label><input id="line2" name="line2" autocomplete="address-line2"></div>
        <div class="form-row">
          <div class="field"><label for="city">City</label><input id="city" name="city" required autocomplete="address-level2"></div>
          <div class="field"><label for="postal">Postal code</label><input id="postal" name="postal" required autocomplete="postal-code"></div>
        </div>
        <div class="field"><label for="country">Country</label>
          <select id="country" name="country" autocomplete="country-name">${['India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Singapore', 'United Arab Emirates']
            .map((c) => `<option>${c}</option>`).join('')}</select></div>
        <h3 style="margin-top:1rem">Payment</h3>
        <p class="muted" style="margin:0">This demo store places the order without charging a card. Connect a payment provider (e.g. Stripe or Razorpay) in <code>server/routes/orders.js</code> to take real payments.</p>
        <p class="error" id="checkout-error"></p>
        <button class="btn btn-block" id="place">Place order · ${money(t.total)}</button>
      </form>
      <aside class="panel summary">
        <h3>Order summary</h3>
        ${state.cart.map((i) => `<div class="line-item" style="grid-template-columns:64px 1fr auto">
          <div class="line-thumb">${garmentSVG(i, i.hex)}</div>
          <div><h4>${esc(i.name)}</h4><small>${esc(i.color)} · ${esc(i.size)} · Qty ${i.quantity}</small></div>
          <strong>${money(i.price * i.quantity)}</strong></div>`).join('')}
        <div style="display:grid;gap:.5rem;margin-top:1rem">
          <div class="row"><span class="muted">Subtotal</span><span>${money(t.subtotal)}</span></div>
          <div class="row"><span class="muted">Shipping</span><span>${t.shipping ? money(t.shipping) : 'Free'}</span></div>
          <div class="row total"><span>Total</span><span>${money(t.total)}</span></div>
        </div>
      </aside>
    </div></div>`;

  $('#checkout-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const btn = $('#place');
    btn.disabled = true;
    $('#checkout-error').textContent = '';
    try {
      const order = await api('/orders', { method: 'POST', body: {
        name: f.get('name'), email: f.get('email'),
        address: { line1: f.get('line1'), line2: f.get('line2'), city: f.get('city'), postal: f.get('postal'), country: f.get('country') },
        items: state.cart.map(({ productId, size, color, quantity }) => ({ productId, size, color, quantity })),
      } });
      clearCart();
      sessionStorage.setItem('nt_last_order', JSON.stringify(order));
      navigate(`/order/${order.id}`);
    } catch (err) {
      $('#checkout-error').textContent = err.message;
      btn.disabled = false;
    }
  });
}

function orderSuccessView(id) {
  let order = null;
  try { order = JSON.parse(sessionStorage.getItem('nt_last_order')); } catch { /* ignore */ }
  if (!order || String(order.id) !== String(id)) order = null;
  app.innerHTML = `<div class="container narrow">
    <div class="success-hero"><div class="success-icon">✓</div><h1>Thank you!</h1>
      <p class="muted">Order <strong>#${esc(id)}</strong> is confirmed${order ? `. A receipt is on its way to <strong>${esc(order.email)}</strong>` : ''}.</p></div>
    ${order ? `<div class="panel">${order.items.map((i) => `<div class="row" style="padding:.4rem 0"><span>${esc(i.name)} <span class="muted">· ${esc(i.color)} · ${esc(i.size)} × ${i.quantity}</span></span><span>${money(i.price * i.quantity)}</span></div>`).join('')}
      <hr style="border:0;border-top:1px solid var(--line);margin:1rem 0">
      <div class="row total"><span>Total</span><span>${money(order.total)}</span></div></div>` : ''}
    <div style="display:flex;gap:.6rem;justify-content:center;margin-top:2rem;flex-wrap:wrap">
      <a href="/shop" data-link class="btn">Continue shopping</a>${state.user ? '<a href="/account" data-link class="btn btn-ghost">View orders</a>' : ''}</div>
  </div>`;
}

function authView(params) {
  const mode = location.pathname === '/register' ? 'register' : 'login';
  const next = params.get('next') || '/account';
  app.innerHTML = `<div class="container narrow"><div class="panel fade-in">
    <span class="eyebrow">${mode === 'login' ? 'Welcome back' : 'Join Nova Threads'}</span>
    <h2>${mode === 'login' ? 'Sign in' : 'Create account'}</h2>
    <form class="form" id="auth-form" style="margin-top:1rem">
      ${mode === 'register' ? '<div class="field"><label for="name">Name</label><input id="name" name="name" required autocomplete="name"></div>' : ''}
      <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" required autocomplete="email"></div>
      <div class="field"><label for="password">Password</label><input id="password" name="password" type="password" required minlength="${mode === 'register' ? 8 : 1}" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}"></div>
      <p class="error" id="auth-error"></p>
      <button class="btn btn-block">${mode === 'login' ? 'Sign in' : 'Create account'}</button>
    </form>
    <p class="muted" style="margin:1.2rem 0 0;text-align:center">${mode === 'login'
      ? `New here? <a class="link" href="/register?next=${encodeURIComponent(next)}" data-link>Create an account</a>`
      : `Already have an account? <a class="link" href="/login?next=${encodeURIComponent(next)}" data-link>Sign in</a>`}</p>
  </div></div>`;
  $('#auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      if (mode === 'login') await login(f.get('email'), f.get('password'));
      else await register(f.get('name'), f.get('email'), f.get('password'));
      toast(`Welcome, ${state.user.name.split(' ')[0]}!`);
      navigate(next.startsWith('/') && !next.startsWith('//') ? next : '/account');
    } catch (err) { $('#auth-error').textContent = err.message; }
  });
}

async function accountView() {
  if (!state.user) return navigate('/login?next=/account', { replace: true });
  const u = state.user;
  app.innerHTML = `<div class="container" style="padding-bottom:5rem">
    <div class="page-head" style="display:flex;justify-content:space-between;align-items:end;flex-wrap:wrap;gap:1rem">
      <div><span class="eyebrow">My account</span><h1>Hi, ${esc(u.name.split(' ')[0])}</h1><p class="muted" style="margin:0">${esc(u.email)}</p></div>
      <div style="display:flex;gap:.5rem">${u.role === 'admin' ? '<a href="/admin" data-link class="btn btn-sm">Admin dashboard</a>' : ''}
        <button class="btn btn-ghost btn-sm" data-action="logout">Sign out</button></div>
    </div>
    <h3>Order history</h3><div id="orders"><div class="skeleton" style="aspect-ratio:auto;height:120px"></div></div></div>`;
  const orders = await api('/orders/mine');
  $('#orders').innerHTML = orders.length ? orders.map((o) => `<div class="order">
      <div class="order-head"><div><strong>Order #${o.id}</strong> <span class="muted">· ${date(o.created_at)}</span></div>
        <div style="display:flex;gap:.8rem;align-items:center"><span class="status ${esc(o.status)}">${esc(o.status)}</span><strong>${money(o.total)}</strong></div></div>
      <div class="muted" style="font-size:.88rem">${o.items.map((i) => `${esc(i.name)} (${esc(i.color)}, ${esc(i.size)}) × ${i.quantity}`).join(' · ')}</div>
    </div>`).join('')
    : `<div class="empty"><p class="muted">You haven't placed any orders yet.</p><a href="/shop" data-link class="btn btn-sm">Start shopping</a></div>`;
}

function aboutView() {
  app.innerHTML = `<div class="container">
    <section class="hero"><div class="hero-grid">
      <div class="fade-in"><span class="eyebrow">Our story</span><h1>Fewer, <em class="italic">better</em> things.</h1>
        <p class="lead">Nova Threads started in a tiny studio with one idea: make the clothes you actually live in — and make them properly. No trend cycles, no endless drops. Just thoughtful essentials, built to last.</p></div>
      <div class="hero-art" aria-hidden="true">
        <div class="hero-card c1">${garmentSVG({ slug: 'tee', category: 'tees', name: '' }, '#e9e3d7')}</div>
        <div class="hero-card c2">${garmentSVG({ slug: 'pants', category: 'bottoms', name: '' }, '#25304a')}</div>
        <div class="hero-card c3">${garmentSVG({ slug: 'cap', name: '' }, '#5c6040')}</div>
      </div></div></section>
    <div class="values" style="margin-bottom:4rem">
      <div class="value"><div class="num">2019</div><h3>Founded</h3><p class="muted">Born from frustration with fast fashion that fell apart after a few washes.</p></div>
      <div class="value"><div class="num">3</div><h3>Partner factories</h3><p class="muted">Family-run, audited, and visited by our team every single season.</p></div>
      <div class="value"><div class="num">0</div><h3>Virgin plastic</h3><p class="muted">Recycled packaging and carbon-neutral shipping on every order.</p></div>
    </div>
    <section class="panel" id="shipping" style="margin-bottom:5rem">
      <h2>Shipping & returns</h2>
      <details open><summary>Shipping</summary><p>Free standard shipping on orders over ${money(FREE_SHIPPING)}; otherwise a flat $8. Orders ship within 1–2 business days.</p></details>
      <details><summary>Returns & exchanges</summary><p>Unworn items can be returned within 30 days for a full refund or exchange. Returns are always free.</p></details>
      <details><summary>Repairs</summary><p>If something wears out sooner than it should, contact us — we'll repair or replace it at no cost.</p></details>
    </section></div>`;
}

function contactView() {
  app.innerHTML = `<div class="container narrow" style="max-width:620px"><div class="panel fade-in">
    <span class="eyebrow">Get in touch</span><h2>We'd love to hear from you</h2>
    <p class="muted">Questions about sizing, an order, or wholesale? Send us a note.</p>
    <form class="form" data-form="contact">
      <div class="form-row"><div class="field"><label for="c-name">Name</label><input id="c-name" name="name" required value="${esc(state.user?.name)}"></div>
        <div class="field"><label for="c-email">Email</label><input id="c-email" name="email" type="email" required value="${esc(state.user?.email)}"></div></div>
      <div class="field"><label for="c-msg">Message</label><textarea id="c-msg" name="message" required></textarea></div>
      <button class="btn">Send message</button>
    </form></div></div>`;
}

// ---------- admin ----------
async function adminView(params) {
  if (!state.user) return navigate('/login?next=/admin', { replace: true });
  if (state.user.role !== 'admin') return notFoundView();
  const tab = params.get('tab') || 'overview';
  app.innerHTML = `<div class="container" style="padding-bottom:5rem">
    <div class="page-head"><span class="eyebrow">Admin</span><h1>Dashboard</h1></div>
    <div class="tabs">${['overview', 'orders', 'products', 'messages'].map((t) => `<a class="chip ${t === tab ? 'active' : ''}" href="/admin?tab=${t}" data-link>${t}</a>`).join('')}</div>
    <div id="admin-body"><div class="skeleton" style="aspect-ratio:auto;height:200px"></div></div></div>`;
  const body = $('#admin-body');

  if (tab === 'overview') {
    const s = await api('/admin/stats');
    body.innerHTML = `<div class="stats">
      <div class="stat"><span>Revenue</span><strong>${money(s.revenue)}</strong></div>
      <div class="stat"><span>Orders</span><strong>${s.orders}</strong></div>
      <div class="stat"><span>Customers</span><strong>${s.customers}</strong></div>
      <div class="stat"><span>Subscribers</span><strong>${s.subscribers}</strong></div></div>
      <h3>Low stock</h3>${s.lowStock.length ? `<div class="table-wrap"><table><tr><th>Product</th><th>Stock</th></tr>
        ${s.lowStock.map((p) => `<tr><td>${esc(p.name)}</td><td>${p.stock}</td></tr>`).join('')}</table></div>` : '<p class="muted">All products are well stocked.</p>'}`;
  }

  if (tab === 'orders') {
    const orders = await api('/admin/orders');
    body.innerHTML = orders.length ? `<div class="table-wrap"><table>
      <tr><th>#</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th></tr>
      ${orders.map((o) => `<tr><td>${o.id}</td><td>${date(o.created_at)}</td><td>${esc(o.name)}<br><small class="muted">${esc(o.email)}</small></td>
        <td>${o.items.reduce((n, i) => n + i.quantity, 0)}</td><td>${money(o.total)}</td>
        <td><select class="select" data-order="${o.id}">${['pending', 'paid', 'shipped', 'delivered', 'cancelled'].map((s) => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td></tr>`).join('')}
      </table></div>` : '<div class="empty"><p class="muted">No orders yet.</p></div>';
    body.querySelectorAll('[data-order]').forEach((sel) => sel.addEventListener('change', async () => {
      try { await api(`/admin/orders/${sel.dataset.order}`, { method: 'PATCH', body: { status: sel.value } }); toast('Order updated'); }
      catch (err) { toast(err.message); }
    }));
  }

  if (tab === 'products') {
    const products = await api('/products?limit=100&sort=newest');
    body.innerHTML = `<div style="margin-bottom:1rem"><button class="btn btn-sm" data-edit="new">+ Add product</button></div>
      <div class="table-wrap"><table><tr><th></th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th></th></tr>
      ${products.map((p) => `<tr><td><div class="mini">${productVisual(p)}</div></td><td>${esc(p.name)}</td><td>${esc(label(p.category))}</td>
        <td>${priceHTML(p)}</td><td>${p.stock}</td>
        <td><button class="btn btn-ghost btn-sm" data-edit="${p.id}">Edit</button> <button class="btn btn-ghost btn-sm" data-del="${p.id}">Delete</button></td></tr>`).join('')}
      </table></div>`;
    body.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () =>
      productEditor(products.find((p) => String(p.id) === b.dataset.edit))));
    body.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      const p = products.find((x) => String(x.id) === b.dataset.del);
      if (!confirm(`Delete “${p.name}”? This cannot be undone.`)) return;
      await api(`/admin/products/${p.id}`, { method: 'DELETE' });
      toast('Product deleted');
      render();
    }));
  }

  if (tab === 'messages') {
    const msgs = await api('/admin/messages');
    body.innerHTML = msgs.length ? msgs.map((m) => `<div class="order"><div class="order-head"><strong>${esc(m.name)} <span class="muted">· ${esc(m.email)}</span></strong>
      <span class="muted">${date(m.created_at)}</span></div><p style="margin:0;white-space:pre-wrap">${esc(m.message)}</p></div>`).join('')
      : '<div class="empty"><p class="muted">No messages yet.</p></div>';
  }
}

function productEditor(p) {
  const isNew = !p;
  p ||= { name: '', category: 'tees', gender: 'unisex', price: 0, compare_at: null, stock: 0, description: '', sizes: ['S', 'M', 'L'],
    colors: [{ name: 'Onyx', hex: '#1b1b1d' }], featured: false, is_new: true, image: '' };
  const modal = document.createElement('div');
  modal.className = 'modal';
  const colorRow = (c) => `<div class="color-row"><input class="input" name="cname" placeholder="Color name" value="${esc(c.name)}">
    <input type="color" name="chex" value="${esc(c.hex)}"><button type="button" class="btn btn-ghost btn-sm" data-rm>✕</button></div>`;
  modal.innerHTML = `<div class="panel"><h3>${isNew ? 'Add product' : 'Edit product'}</h3>
    <form class="form" id="pform">
      <div class="field"><label>Name</label><input name="name" required value="${esc(p.name)}"></div>
      <div class="form-row">
        <div class="field"><label>Category</label><select name="category">${Object.keys(CATEGORY_LABELS).map((c) => `<option value="${c}" ${c === p.category ? 'selected' : ''}>${label(c)}</option>`).join('')}</select></div>
        <div class="field"><label>For</label><select name="gender">${['unisex', 'women', 'men'].map((g) => `<option ${g === p.gender ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Price ($)</label><input name="price" type="number" step="0.01" min="0" required value="${p.price / 100 || ''}"></div>
        <div class="field"><label>Compare-at price ($, optional)</label><input name="compare_at" type="number" step="0.01" min="0" value="${p.compare_at ? p.compare_at / 100 : ''}"></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Stock</label><input name="stock" type="number" min="0" required value="${p.stock}"></div>
        <div class="field"><label>Sizes (comma separated)</label><input name="sizes" required value="${esc(p.sizes.join(', '))}"></div>
      </div>
      <div class="field"><label>Image URL (optional — leave blank to use the illustration)</label><input name="image" placeholder="https://… or /images/…" value="${esc(p.image)}"></div>
      <div class="field"><label>Description</label><textarea name="description">${esc(p.description)}</textarea></div>
      <div class="field"><label>Colors</label><div id="colors" style="display:grid;gap:.5rem">${p.colors.map(colorRow).join('')}</div>
        <button type="button" class="btn btn-ghost btn-sm" id="add-color" style="justify-self:start">+ Add color</button></div>
      <div style="display:flex;gap:1.5rem"><label class="check"><input type="checkbox" name="featured" ${p.featured ? 'checked' : ''}> Featured</label>
        <label class="check"><input type="checkbox" name="is_new" ${p.is_new ? 'checked' : ''}> New arrival</label></div>
      <p class="error" id="perr"></p>
      <div style="display:flex;gap:.6rem;justify-content:end"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button class="btn">Save</button></div>
    </form></div>`;
  document.body.appendChild(modal);
  document.body.classList.add('locked');
  const close = () => { modal.remove(); document.body.classList.remove('locked'); };
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.closest('[data-close]')) close();
    if (e.target.closest('[data-rm]')) e.target.closest('.color-row').remove();
  });
  $('#add-color', modal).addEventListener('click', () => $('#colors', modal).insertAdjacentHTML('beforeend', colorRow({ name: '', hex: '#888888' })));
  $('#pform', modal).addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const names = f.getAll('cname');
    const hexes = f.getAll('chex');
    const payload = Object.fromEntries(['name', 'category', 'gender', 'price', 'compare_at', 'stock', 'sizes', 'description', 'image'].map((k) => [k, f.get(k)]));
    payload.colors = names.map((name, i) => ({ name, hex: hexes[i] }));
    payload.featured = f.has('featured');
    payload.is_new = f.has('is_new');
    if (!isNew) payload.slug = p.slug;
    try {
      await api(isNew ? '/admin/products' : `/admin/products/${p.id}`, { method: isNew ? 'POST' : 'PUT', body: payload });
      close(); toast('Product saved'); render();
    } catch (err) { $('#perr', modal).textContent = err.message; }
  });
}

function notFoundView() {
  app.innerHTML = `<div class="container narrow" style="text-align:center"><span class="eyebrow">404</span><h1>Lost in the racks</h1>
    <p class="muted">We couldn't find that page.</p><a href="/" data-link class="btn">Back home</a></div>`;
}

// ---------- cart drawer ----------
const drawer = document.getElementById('cart');
const overlay = document.getElementById('overlay');

function renderCart() {
  const t = cartTotals();
  const count = document.getElementById('bag-count');
  count.hidden = t.count === 0;
  count.textContent = t.count;
  const remaining = Math.max(0, FREE_SHIPPING - t.subtotal);
  drawer.innerHTML = `
    <div class="drawer-head"><h3>Your bag (${t.count})</h3><button class="icon-btn" data-action="close-cart" aria-label="Close bag">
      <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <div class="drawer-body">
      ${t.count ? `<div class="ship-bar">${remaining ? `You're <strong>${money(remaining)}</strong> away from free shipping` : '🎉 You\'ve unlocked <strong>free shipping</strong>'}
        <div class="track"><div class="fill" style="width:${Math.min(100, (t.subtotal / FREE_SHIPPING) * 100)}%"></div></div></div>` : ''}
      ${t.count ? state.cart.map((i) => `<div class="line-item">
          <a href="/product/${esc(i.slug)}" data-link class="line-thumb">${garmentSVG(i, i.hex)}</a>
          <div><h4>${esc(i.name)}</h4><small>${esc(i.color)} · ${esc(i.size)}</small>
            <div class="qty sm"><button data-cart="${esc(keyOf(i))}" data-d="-1" aria-label="Decrease">−</button><span>${i.quantity}</span><button data-cart="${esc(keyOf(i))}" data-d="1" aria-label="Increase">+</button></div></div>
          <div style="text-align:right"><strong>${money(i.price * i.quantity)}</strong><br><button class="link muted" style="font-size:.8rem;margin-top:.4rem" data-cart="${esc(keyOf(i))}" data-d="remove">Remove</button></div>
        </div>`).join('')
        : `<div style="text-align:center;padding:4rem 0"><h3>Your bag is empty</h3><p class="muted">Add something you'll wear on repeat.</p><a href="/shop" data-link class="btn btn-sm">Shop now</a></div>`}
    </div>
    ${t.count ? `<div class="drawer-foot">
      <div class="row"><span class="muted">Subtotal</span><span>${money(t.subtotal)}</span></div>
      <div class="row"><span class="muted">Shipping</span><span>${t.shipping ? money(t.shipping) : 'Free'}</span></div>
      <div class="row total"><span>Total</span><span>${money(t.total)}</span></div>
      <a href="/checkout" data-link class="btn btn-block">Checkout</a></div>` : ''}`;
}

function openCart() { drawer.classList.add('open'); overlay.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); document.body.classList.add('locked'); }
function closeCart() { drawer.classList.remove('open'); overlay.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); document.body.classList.remove('locked'); }

// ---------- router ----------
function navigate(url, { replace = false } = {}) {
  if (replace) history.replaceState(null, '', url); else history.pushState(null, '', url);
  render();
}

async function render() {
  const { pathname } = location;
  const params = new URLSearchParams(location.search);
  document.title = 'Nova Threads — Made to be lived in';
  closeCart();
  document.getElementById('nav').classList.remove('open');
  document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === pathname + location.search));
  try {
    if (pathname === '/') await homeView();
    else if (pathname === '/shop') await shopView(params);
    else if (pathname.startsWith('/product/')) await productView(decodeURIComponent(pathname.slice(9)));
    else if (pathname === '/checkout') checkoutView();
    else if (pathname.startsWith('/order/')) orderSuccessView(pathname.slice(7));
    else if (pathname === '/login' || pathname === '/register') authView(params);
    else if (pathname === '/account') await accountView();
    else if (pathname === '/about') aboutView();
    else if (pathname === '/contact') contactView();
    else if (pathname === '/admin') await adminView(params);
    else notFoundView();
  } catch (err) {
    console.error(err);
    app.innerHTML = `<div class="container narrow" style="text-align:center"><h2>Something went wrong</h2><p class="muted">${esc(err.message)}</p>
      <button class="btn" onclick="location.reload()">Try again</button></div>`;
  }
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  else window.scrollTo(0, 0);
}

// ---------- global events ----------
document.addEventListener('click', async (e) => {
  const a = e.target.closest('a[data-link]');
  if (a && !e.metaKey && !e.ctrlKey && !e.shiftKey && a.target !== '_blank') {
    e.preventDefault();
    navigate(a.getAttribute('href'));
    return;
  }
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (action === 'open-cart') openCart();
  if (action === 'close-cart') closeCart();
  if (action === 'menu') document.getElementById('nav').classList.toggle('open');
  if (action === 'logout') { logout(); toast('Signed out'); navigate('/'); }
  if (action === 'quick-add') {
    const btn = e.target.closest('[data-slug]');
    const p = await api(`/products/${encodeURIComponent(btn.dataset.slug)}`);
    if (p.sizes.length === 1 || p.sizes.includes('M')) {
      const size = p.sizes.length === 1 ? p.sizes[0] : 'M';
      addToCart(p, { size, color: p.colors[0], quantity: 1 });
      toast(`Added ${p.name} (${p.colors[0].name}, ${size})`);
    } else navigate(`/product/${p.slug}`);
  }
  const cartBtn = e.target.closest('[data-cart]');
  if (cartBtn) {
    const item = state.cart.find((i) => keyOf(i) === cartBtn.dataset.cart);
    const d = cartBtn.dataset.d;
    updateQuantity(cartBtn.dataset.cart, d === 'remove' ? 0 : item.quantity + Number(d));
  }
});

document.addEventListener('submit', async (e) => {
  const kind = e.target.dataset.form;
  if (!kind) return;
  e.preventDefault();
  const f = new FormData(e.target);
  if (kind === 'search') { navigate(`/shop?q=${encodeURIComponent(f.get('q').trim())}`); return; }
  try {
    const res = await api(kind === 'newsletter' ? '/newsletter' : '/contact', { method: 'POST', body: Object.fromEntries(f) });
    toast(res.message);
    e.target.reset();
  } catch (err) { toast(err.message); }
});

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeCart(); document.querySelector('.modal')?.remove(); document.body.classList.remove('locked'); } });
window.addEventListener('popstate', render);

subscribe(renderCart);
document.getElementById('year').textContent = new Date().getFullYear();
renderCart();
loadUser().finally(render);
