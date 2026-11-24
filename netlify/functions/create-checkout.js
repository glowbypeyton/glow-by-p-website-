/**
 * create-checkout.js
 * ---------------------------------------------------------------
 * Takes the current cart (sent from cart.html) and asks Square's
 * API to build ONE combined checkout link covering every item —
 * this is what lets the site offer a real multi-item cart while
 * still using Square as the payment processor.
 *
 * Requires two environment variables, set in Netlify site settings
 * (Site configuration > Environment variables) — never put these
 * in the front-end code, only here:
 *   SQUARE_ACCESS_TOKEN  — from your Square Developer application
 *   SQUARE_LOCATION_ID   — the location the sale should post to
 *
 * See README.md for the full setup walkthrough.
 * ------------------------------------------------------------- */

const { getDatabase } = require('@netlify/database');
const { SALE, isSaleActive, appliesTo } = require('./lib/sale');

const SQUARE_VERSION = '2025-01-23';
const SQUARE_API_BASE = 'https://connect.squareup.com/v2';
// Combined CA sales tax rate for Murrieta, 92563 — from CDTFA's
// official rate table. Update this if the rate ever changes.
const SALES_TAX_PERCENT = 8.75;
// Gift card amounts customers can pick (keep in sync with script.js).
const GIFT_CARD_AMOUNTS = [25, 50, 100, 150];

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;

  console.log('SQUARE_ACCESS_TOKEN present:', !!accessToken, 'length:', accessToken ? accessToken.length : 0);
  console.log('SQUARE_LOCATION_ID present:', !!locationId, 'value:', locationId || '(empty)');

  if (!accessToken || !locationId) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Square is not configured yet. Add SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID in Netlify site settings.'
      })
    };
  }

  let cart;
  try {
    cart = JSON.parse(event.body).cart;
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body.' }) };
  }

  if (!Array.isArray(cart) || cart.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Cart is empty.' }) };
  }

  // Build Square line items from the cart. Prices on the site are
  // stored in whole dollars (e.g. 32), Square wants cents (3200).
  // Names and prices come from the products table, never from the
  // browser — so nobody can edit a price before paying. The product
  // slug rides along as line-item metadata so square-webhook.js can
  // subtract the sold quantity from stock once the payment completes.
  let productsBySlug = {};
  try {
    const db = getDatabase({ connectionString: process.env.DATABASE_CONNECTION_STRING });
    const rows = await db.sql`SELECT slug, name, category, price FROM products`;
    rows.forEach(function (p) { productsBySlug[p.slug] = p; });
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not load products. Please try again.' }) };
  }

  const saleOn = isSaleActive();
  const SALE_UID = 'store-sale';
  let anyDiscounted = false;
  const TAX_UID = 'sales-tax';
  let anyTaxed = false;
  const lineItems = [];
  for (const item of cart) {
    // Gift cards come in as "gift-card:100" — the chosen amount must be
    // one of GIFT_CARD_AMOUNTS (keep in sync with script.js).
    let id = String(item && item.id);
    let giftAmount = null;
    const giftMatch = /^gift-card:(\d+)$/.exec(id);
    if (giftMatch) {
      giftAmount = parseInt(giftMatch[1], 10);
      if (GIFT_CARD_AMOUNTS.indexOf(giftAmount) === -1) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Please choose a gift card amount from the list.' }) };
      }
      id = 'gift-card';
    }
    const product = productsBySlug[id];
    if (!product) {
      return { statusCode: 400, body: JSON.stringify({ error: 'An item in your cart is no longer available. Please remove it and try again.' }) };
    }
    const qty = Math.min(Math.max(parseInt(item.qty, 10) || 1, 1), 99);
    const unitPrice = giftAmount !== null ? giftAmount : Number(product.price);
    const lineItem = {
      name: (String(product.name) + (giftAmount !== null ? ' – $' + giftAmount : '')).slice(0, 500),
      quantity: String(qty),
      base_price_money: {
        amount: Math.round(unitPrice * 100),
        currency: 'USD'
      },
      metadata: { slug: String(product.slug).slice(0, 255) }
    };
    if (saleOn && appliesTo(product)) {
      lineItem.applied_discounts = [{ discount_uid: SALE_UID }];
      anyDiscounted = true;
    }
    // Gift cards aren't taxable in CA; everything else gets sales tax.
    if (product.category !== 'gifts') {
      lineItem.applied_taxes = [{ tax_uid: TAX_UID }];
      anyTaxed = true;
    }
    lineItems.push(lineItem);
  }

  const idempotencyKey =
    Date.now().toString(36) + Math.random().toString(36).slice(2);

  try {
    const response = await fetch(SQUARE_API_BASE + '/online-checkout/payment-links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + accessToken,
        'Square-Version': SQUARE_VERSION
      },
      body: JSON.stringify({
        idempotency_key: idempotencyKey,
        order: {
          location_id: locationId,
          line_items: lineItems,
          // Store-wide sale (see lib/sale.js) — shows on Square's
          // checkout as its own discount line, applied only to the
          // line items tagged above (never gift cards).
          ...(anyDiscounted ? {
            discounts: [{
              uid: SALE_UID,
              name: SALE.name + ' (' + SALE.percent + '% off)',
              percentage: String(SALE.percent),
              scope: 'LINE_ITEM'
            }]
          } : {}),
          // Murrieta, CA (92563) combined sales tax rate — confirmed
          // against CDTFA's official rate table. Applied to every line
          // item tagged above (all products except gift cards); Square
          // adds it as a separate line on checkout, it's not baked into
          // each item's price. If this changes, update SALES_TAX_PERCENT.
          ...(anyTaxed ? {
            taxes: [
              {
                uid: TAX_UID,
                name: 'Sales Tax',
                percentage: String(SALES_TAX_PERCENT),
                scope: 'LINE_ITEM'
              }
            ]
          } : {}),
          // Marks every order as in-store pickup — Square's hosted
          // checkout shows the pickup location's address (whatever is
          // set on this Location in your Square dashboard) and this
          // note to the customer. schedule_type "ASAP" means Square
          // computes the ready time from prep_time_duration instead of
          // asking the customer to pick a time slot.
          fulfillments: [
            {
              type: 'PICKUP',
              pickup_details: {
                schedule_type: 'ASAP',
                prep_time_duration: 'PT2H',
                note: 'PICKUP ONLY — no shipping. Pick up in person at Glow by P, Holistic Haven, Murrieta, CA, 92563.'
              }
            }
          ]
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      var message = (data && data.errors && data.errors[0] && data.errors[0].detail) || 'Square rejected the request.';
      return { statusCode: response.status, body: JSON.stringify({ error: message }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ url: data.payment_link.url })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not reach Square. Please try again.' }) };
  }
};
