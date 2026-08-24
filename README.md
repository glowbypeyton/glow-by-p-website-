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
