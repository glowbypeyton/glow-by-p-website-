# Glow by P — Website

A static, multi-page site: Home, About Me, Services, Shop, Product template,
Cart, Reviews, Contact, and Book Now — plus a 404 page. No build step required.

## Deploy to Netlify (drag & drop — easiest)

1. Go to https://app.netlify.com/drop
2. Drag this entire folder into the browser window.
3. Netlify will give you a live URL in seconds (e.g. `random-name.netlify.app`).
4. In Site settings → Domain management, add your custom domain when ready.

## Deploy to Netlify (via Git — recommended for ongoing edits)

1. Push this folder to a GitHub/GitLab/Bitbucket repo.
2. In Netlify: **Add new site → Import an existing project** → connect the repo.
3. Build settings: leave the build command blank, and set the publish
   directory to `.` (the repo root) — this is already set in `netlify.toml`.
4. Deploy. Every future push to the repo will auto-deploy.

## What's a placeholder right now

- **The Book section on the homepage** — title, price, description, cover
  photo, and the "Buy on Amazon" link are all placeholders (`index.html`,
  search for "BOOK"). Swap in the real title, price, a short description,
  the actual book cover, and your real Amazon (or other seller) link.
- **All photography** — every image is a labeled soft-textured placeholder box
  (e.g. "Studio photo placeholder"). Swap each `.ph` block for a real `<img>`
  tag, or replace the background image referenced in the CSS.
- **The "Book/Order" icons** on the homepage — recreated as simple line icons
  in the same minimal style described in the brief. If you can send me the
  actual icon graphic from your current site, I can drop it in exactly as-is.
- **The Book Now page** has a placeholder block where your real booking
  platform (Vagaro, Acuity, Square Appointments, Boulevard, etc.) should be
  embedded via `<iframe>` or linked out to.
- **The Shop cart** (`cart.html`, and the Add to Cart / Buy Now buttons)
  is a working demo built with `localStorage` so the shopping experience is
  fully clickable today. It is NOT connected to real payments. Every
  Add to Cart / Buy Now button already carries `data-product-id`,
  `data-product-name`, and `data-product-price` attributes — when you're
  ready to connect Shopify, Square, or another storefront, swap the cart
  logic in `script.js` for real checkout calls, or replace the buttons with
  direct links to your storefront's product pages.
- **Reviews** are clearly marked placeholders — swap in real client
  testimonials whenever you have them.
- **Contact info** (address, hours) — placeholders to fill in.
- **`product.html`** is a single working example (Gentle Cream Cleanser).
  Duplicate it per product, or generate these pages dynamically once
  connected to a real commerce platform.

## Admin Dashboard (Phase 1 of the client/admin portal project)

This is the first piece of a bigger project: a private admin dashboard
where you can see everything submitted through your Contact form and
Glow Note newsletter signup — both of which previously just showed a
"success" message and went nowhere. Now they're saved to a real
database and you can read them at `/admin-dashboard.html`.

**How to log in:** go to `yoursite.netlify.app/admin-login.html`. This
page isn't linked anywhere in the public navigation — it's meant to
stay private, reachable only if you know the URL. Bookmark it.

**One-time setup — add 3 new environment variables in Netlify:**

Site configuration → Environment variables → Add a variable, same as
you did for Square. Add all three, scoped to Builds/Functions/Runtime
like before:

| Key | Value |
|---|---|
| `ADMIN_EMAIL` | Whatever email you want to log in with (doesn't need to be a real inbox — just your login username) |
| `ADMIN_PASSWORD` | A password of your choice for logging into the dashboard |
| `ADMIN_SESSION_SECRET` | `9fd1681af3ba615f68962cdeb081cf7d8dade7db77e299ba50c6c021d210f67e` (a random value I generated for you — paste it in exactly as-is, you'll never need to type or remember this one) |

After adding all three, redeploy (Trigger deploy → Clear cache and
deploy site) so the login function picks them up — same as we did
troubleshooting Square.

**What's new in this update:**
- `netlify/database/migrations/0001_contact_and_newsletter.sql` — sets
  up the database tables. Netlify applies this automatically on
  deploy, no action needed from you.
- `package.json` — lists the database package as a dependency so
  Netlify installs it during the build.
- `netlify/functions/admin-login.js`, `admin-logout.js`,
  `get-submissions.js`, `submit-contact.js`, `submit-newsletter.js`,
  and `netlify/functions/lib/admin-session.js` — the backend.
- `admin-login.html`, `admin-dashboard.html` — the two new pages.
- The Contact page and homepage newsletter form now actually save to
  the database instead of just showing a fake success message.
- The homepage tagline now includes "Acne Specialist," and there's a
  new "Your Weekly Glow Note" signup section above the final call to
  action.

**What's next:** this is only Phase 1 of the full client/admin portal
project we scoped out — client accounts, routines, progress photos,
order history, and reviews with photos are still to come in later
phases.

## Client Portal (Phase 2 of the client/admin portal project)

Clients can now create a real account (with a securely hashed password —
never stored in plain text) and sign in at `client-portal.html`, reachable
from "Client Portal" in the main navigation on every page.

Once signed in, they land on `client-dashboard.html`, which currently shows
three empty sections — **Your Routine**, **Progress Photos**, and **Order
History** — each marked "coming soon." These get filled in during Phase 3
(you'll be able to add a client's routine, progress photos, and visit notes
from your admin dashboard) and Phase 4 (Square purchases will show up here
automatically).

**One-time setup — add 1 new environment variable in Netlify:**

Site configuration → Environment variables → Add a variable, scoped to
Builds/Functions/Runtime like the others:

| Key | Value |
|---|---|
| `CLIENT_SESSION_SECRET` | `75bb972d9e14816c21dbdde1b9b29dd088e7708ea03067191f7c3e2774f3205c` (a random value I generated for you — paste it in exactly as-is) |

This is separate from `ADMIN_SESSION_SECRET` on purpose — it keeps client
logins and your admin login cryptographically independent, so one can
never be used to fake the other.

After adding it, redeploy (Trigger deploy → Clear cache and deploy site,
or push to GitHub and let it redeploy automatically) so the new functions
pick it up.

**What's new in this update:**
- `netlify/database/migrations/0002_clients.sql` — adds the `clients`
  table. Applies automatically on deploy.
- `netlify/functions/client-signup.js`, `client-login.js`,
  `client-logout.js`, `client-me.js` — the backend.
- `netlify/functions/lib/password.js` — password hashing (uses Node's
  built-in `crypto`, no extra dependency).
- `netlify/functions/lib/client-session.js` — signed-cookie sessions for
  clients, separate from the admin session system.
- `client-portal.html`, `client-dashboard.html` — the two new pages.
- "Client Portal" added to the navigation on every page.

**A note on the database connection:** every function that talks to the
database (`client-signup.js`, `client-login.js`, `client-me.js`, and all
of Phase 1's functions) explicitly passes `connectionString:
process.env.DATABASE_CONNECTION_STRING`. This was the fix we landed on
after troubleshooting Phase 1 — if you ever add a new function that
needs the database, copy that same pattern rather than calling
`getDatabase()` with no arguments.

## Connecting Square checkout (combined cart)

Checkout is powered by a small serverless function
(`netlify/functions/create-checkout.js`) that calls Square's API to build
**one combined checkout link** for everything in the cart — so customers
can add several products, adjust quantities, and pay for all of it in a
single Square checkout. Your Square credentials are never exposed in the
site's code; the function keeps them private on Netlify's servers.

**Step 1 — Get your Square API credentials**

1. Go to [developer.squareup.com/apps](https://developer.squareup.com/apps)
   and sign in with your existing Square account.
2. Click **+ New Application**, give it any name (e.g. "Glow by P
   Website"), and open it.
3. Make sure you're viewing **Production** (not Sandbox) in the top
   toggle, since this needs to process real payments.
4. Copy the **Access Token** shown there — this is `SQUARE_ACCESS_TOKEN`.
5. Still in the dashboard, find your **Location ID** — under
   **Locations** in the left menu — and copy it. This is
   `SQUARE_LOCATION_ID`.

**Step 2 — Add them to Netlify (never to the site's code)**

1. In your Netlify dashboard, open this site → **Site configuration** →
   **Environment variables**.
2. Add a variable named `SQUARE_ACCESS_TOKEN` with the token from Step 1.
3. Add a second variable named `SQUARE_LOCATION_ID` with your location ID.
4. Save, then trigger a new deploy (drag the folder onto the Deploys page
   again, or click "Trigger deploy" if you've connected Git) so the
   function picks up the new values.

**Step 3 — Deploy the function itself**

The `netlify/functions/create-checkout.js` file and the updated
`netlify.toml` (which now points Netlify at that folder) are already in
this project — dragging the whole folder onto your site's Deploys page
should pick it up automatically, as long as you're logged into your
Netlify account when you do it (anonymous drops don't support functions).

If the function doesn't show up under **Site configuration → Functions**
after deploying, the most reliable fallback is connecting this project to
a GitHub repository instead of drag-and-drop — Netlify always builds
functions correctly from a connected Git repo. Let me know if you'd like
help setting that up.

**How it works for customers:**
- **Add to Cart** still just adds an item to the on-site cart (unchanged).
- **Buy Now** sends just that one item straight to a fresh Square
  checkout.
- On the **Cart page**, **Checkout with Square** sends everything in the
  cart together, and the customer completes one payment covering all of
  it on Square's secure hosted page.

## Tracking product quantity (inventory)

The shop pages now show live stock status ("Only 3 left" / "Sold Out")
based on a number you set yourself — there's no backend or database yet,
so this is a manual counter you keep updated by hand.

**Where to edit it:** open `shop.html` (and `index.html`, `product.html`
for the products featured there) and find the product's Add to Cart /
Buy Now button. It looks like this:

```html
<button ... data-product-price="32" data-stock="14">Add to Cart</button>
```

Change the number in `data-stock="14"` to match how many you actually
have. A few rules the site follows automatically:
- **6 or more** → no note shown, button works normally
- **1–5** → shows "Only X left" under the price
- **0** → shows "Sold Out", greys out the product, and disables the button

Update this number whenever you sell a unit (in the studio or a future
real online order) or restock. Every place that product appears
(homepage preview, shop page, its product page) has its own button with
its own `data-stock` — update all of them to the same number so they
stay in sync.

**For your own physical count**, since this is a manual system, keep a
simple running list somewhere outside the website — a Google Sheet or
even the Notes app works fine — with one row per product and a current
count. Update that sheet first when you sell or restock something, then
copy the new number into the matching `data-stock` value on the site.
When you're ready for real-time syncing (stock that updates itself as
orders come in), that's when connecting a platform like Shopify or
Square becomes worth it — until then, this manual approach keeps things
simple and free.

## File structure

```
index.html      Home
about.html      About Me
services.html   Services
shop.html       Shop Skincare (category grid)
product.html    Product detail template
cart.html       Cart (localStorage demo)
reviews.html    Client Love
contact.html    Let's Connect
book.html       Book Your Glow + FAQ
404.html        Not found page
styles.css      Shared design system
script.js       Nav, scroll reveals, FAQ accordion, cart, forms
netlify.toml    Netlify config
```

## Future pages

Room has been left in the footer ("Coming Soon") for **Skin Journal**,
**Resources**, and **FAQ** as standalone pages — happy to build these out
whenever you're ready.
