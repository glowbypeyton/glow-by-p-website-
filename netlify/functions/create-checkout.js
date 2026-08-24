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

const SQUARE_VERSION = '2025-01-23';
const SQUARE_API_BASE = 'https://connect.squareup.com/v2';

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;

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
  const lineItems = cart.map(function (item) {
    return {
      name: String(item.name).slice(0, 500),
      quantity: String(item.qty || 1),
      base_price_money: {
        amount: Math.round(Number(item.price) * 100),
        currency: 'USD'
      }
    };
  });

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
          line_items: lineItems
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
