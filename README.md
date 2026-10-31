# Nova Threads — Full-Stack Clothing Store

A modern, editorial-style e-commerce website for a clothing brand. Node.js + Express API, SQLite database, and a fast single-page frontend written in plain JavaScript, with no build step.

## Features

**Storefront**
- Editorial home page: hero, category tiles, featured and new-arrival edits, brand story and newsletter signup
- Shop page with category, gender, "new" and "sale" filters, search, and sorting
- Product pages with color swatches (the preview changes with the color), size picker, quantity, stock warnings and related products
- Slide-out shopping bag with a free-shipping progress bar; the bag is saved in the browser
- Checkout with order confirmation. The server recalculates every price and checks stock, so the browser can't change what a customer pays
- Customer accounts (register, sign in, order history)
- About / Shipping & Returns and Contact pages
- Responsive layout down to phone size, automatic dark mode, and support for reduced-motion settings

**Admin dashboard** (`/admin`)
- Revenue, order, customer and subscriber stats, plus low-stock alerts
- Order list with status updates (pending → paid → shipped → delivered / cancelled)
- Add, edit and delete products (price, sale price, sizes, colors, stock, featured/new flags, optional image URL)
- Messages sent through the contact form

## Quick start

```bash
npm install
cp .env.example .env    # then edit AUTH_SECRET and ADMIN_PASSWORD
npm start               # http://localhost:3000
```

Requires **Node.js 22.13+**, which includes the built-in `node:sqlite` module. Express is the only dependency.

On first start the database is created at `data/store.db` and filled with 14 sample products and an admin account taken from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (default: `admin@novathreads.com` / `admin12345`). **Change these before deploying.**

| Command | What it does |
| --- | --- |
| `npm start` | Run the server |
| `npm run dev` | Run with auto-restart on file changes |
| `npm test` | Run the API test suite |

## Project structure

```
server/
  index.js          entry point (loads .env, opens DB, starts server)
  app.js            Express app: security headers, routes, SPA fallback
  db.js             SQLite schema + seeding
  seed.js           sample catalogue — edit to load your own products
  auth.js           scrypt password hashing, signed tokens, auth middleware
  routes/           products, auth, orders, admin, newsletter/contact
public/
  index.html        app shell (header, footer, cart drawer)
  css/styles.css    design system (color tokens, layout, components)
  js/app.js         client-side router + all page views
  js/store.js       cart & user state
  js/garment.js     vector garment illustrations tinted by product color
test/api.test.js    end-to-end API tests
```

## API

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/products` | `category`, `gender`, `q`, `new`, `sale`, `featured`, `min`, `max`, `sort` (`featured`, `newest`, `price-asc`, `price-desc`, `name`) |
| GET | `/api/products/categories` | Category names and product counts |
| GET | `/api/products/:slug` | Product plus related items |
| POST | `/api/auth/register` · `/api/auth/login` | Returns `{ token, user }` |
| GET | `/api/auth/me` | Requires a Bearer token |
| POST | `/api/orders` | Guest or signed-in checkout |
| GET | `/api/orders/mine` | Signed-in user's orders |
| POST | `/api/newsletter` · `/api/contact` | |
| * | `/api/admin/*` | `stats`, `orders`, `products`, `messages` (admin only) |

Prices are stored as integer cents.

## Making it yours

- **Brand name and copy:** search for "Nova Threads" in `public/index.html` and `public/js/app.js`.
- **Colors and fonts:** edit the CSS variables at the top of `public/css/styles.css`.
- **Product photos:** set an image URL on a product in the admin dashboard. Products without a photo use the built-in vector illustration.
- **Payments:** checkout currently places the order without charging a card. Add Stripe or Razorpay in `server/routes/orders.js` (create the payment intent before inserting the order), then set the order status to `paid` from the provider's webhook.
- **Deploying:** works on any Node host with a persistent disk for the SQLite file (Render, Railway, Fly.io, a VPS). Set `AUTH_SECRET` to a long random string.
