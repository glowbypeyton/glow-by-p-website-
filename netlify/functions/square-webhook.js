/**
 * square-webhook.js
 * ---------------------------------------------------------------
 * Square calls this URL when a payment's status changes. When a
 * payment actually COMPLETES, this fetches the full order (for line
 * items and the pickup contact info Square collected at checkout)
 * and saves a row in the `orders` table so it shows up in the admin
 * Orders page. It also subtracts the sold quantities from each
 * product's stock (auto stock drop).
 *
 * Requires two environment variables, set in Netlify site settings
 * (Site configuration > Environment variables):
 *   SQUARE_ACCESS_TOKEN          — already set for create-checkout.js
 *   SQUARE_WEBHOOK_SIGNATURE_KEY — from the webhook subscription you
 *                                  create in the Square Developer
 *                                  Dashboard (Webhooks > Signature Key)
 *
 * In the Square Developer Dashboard, create a webhook subscription
 * pointed at:
 *   https://glowbypeyton.netlify.app/.netlify/functions/square-webhook
 * subscribed to the "payment.updated" event. That exact URL is also
 * hardcoded below — it must match, because Square signs each request
 * using the notification URL as part of the signature.
 * ------------------------------------------------------------- */

const crypto = require('crypto');
const { getDatabase } = require('@netlify/database');

const SQUARE_VERSION = '2025-01-23';
const SQUARE_API_BASE = 'https://connect.squareup.com/v2';
const NOTIFICATION_URL = 'https://glowbypeyton.netlify.app/.netlify/functions/square-webhook';

function isValidSignature(signatureHeader, rawBody, signatureKey) {
  if (!signatureHeader || !signatureKey) return false;
  const hmac = crypto.createHmac('sha256', signatureKey);
  hmac.update(NOTIFICATION_URL + rawBody);
  const expected = hmac.digest('base64');
  try {
    const a = Buffer.from(signatureHeader);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (e) {
    return false;
  }
}

exports.handler = async function (event) {
  // Square does a reachability check (GET/HEAD) against this URL
  // before it'll let you save a webhook subscription in the
  // dashboard — it needs a normal response, not a 405, or the
  // dashboard reports the URL as invalid.
  if (event.httpMethod === 'GET' || event.httpMethod === 'HEAD') {
    return { statusCode: 200, body: 'OK' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const signatureHeader = (event.headers && (event.headers['x-square-hmacsha256-signature'] || event.headers['X-Square-Hmacsha256-Signature'])) || '';
  const rawBody = event.body || '';

  if (!signatureKey || !isValidSignature(signatureHeader, rawBody, signatureKey)) {
    return { statusCode: 401, body: 'Invalid signature.' };
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (e) {
    return { statusCode: 400, body: 'Invalid JSON.' };
  }

  // Only act once a payment has actually completed — never on
  // creation/pending, so abandoned checkouts never show up as orders.
  const payment = payload && payload.data && payload.data.object && payload.data.object.payment;
  if (payload.type !== 'payment.updated' || !payment || payment.status !== 'COMPLETED') {
    return { statusCode: 200, body: 'Ignored.' };
  }

  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  if (!accessToken) {
    return { statusCode: 500, body: 'Square is not configured.' };
  }

  let items = [];
  let customerName = null;
  let customerEmail = null;

  // The payment webhook alone doesn't include line items or the
  // pickup contact info — fetch the full order for those.
  if (payment.order_id) {
    try {
      const orderRes = await fetch(SQUARE_API_BASE + '/orders/' + payment.order_id, {
        headers: {
          'Authorization': 'Bearer ' + accessToken,
          'Square-Version': SQUARE_VERSION
        }
      });
      const orderData = await orderRes.json();
      const order = orderData && orderData.order;
      if (order) {
        items = (order.line_items || []).map(function (li) {
          return {
            name: li.name,
            slug: (li.metadata && li.metadata.slug) || null,
            qty: Number(li.quantity) || 1,
            price: li.base_price_money ? li.base_price_money.amount / 100 : 0
          };
        });
        const recipient = order.fulfillments && order.fulfillments[0] && order.fulfillments[0].pickup_details && order.fulfillments[0].pickup_details.recipient;
        if (recipient) {
          customerName = recipient.display_name || null;
          customerEmail = recipient.email_address || null;
        }
      }
    } catch (e) {
      // Still record the payment even if the order lookup fails —
      // partial info (no line items) beats no record at all.
    }
  }

  const totalAmount = payment.amount_money ? payment.amount_money.amount / 100 : 0;

  const db = getDatabase({ connectionString: process.env.DATABASE_CONNECTION_STRING });
  let inserted;
  try {
    inserted = await db.sql`
      INSERT INTO orders (square_order_id, square_payment_id, customer_name, customer_email, items, total_amount, status)
      VALUES (${payment.order_id || null}, ${payment.id}, ${customerName}, ${customerEmail}, ${JSON.stringify(items)}::jsonb, ${totalAmount}, 'paid')
      ON CONFLICT (square_payment_id) DO NOTHING
      RETURNING id
    `;
  } catch (e) {
    return { statusCode: 500, body: 'Could not save order.' };
  }

  // Auto stock drop: subtract each sold item from its product's stock.
  // Only runs when the order row was newly inserted, so Square
  // re-sending the same webhook never subtracts twice. Matches by
  // slug (sent as line-item metadata from create-checkout.js), falling
  // back to the product name for checkouts created before that
  // existed. Stock never goes below 0.
  if (inserted && inserted.length > 0) {
    for (const item of items) {
      try {
        if (item.slug) {
          await db.sql`
            UPDATE products SET stock = GREATEST(stock - ${item.qty}, 0), updated_at = now()
            WHERE slug = ${item.slug}
          `;
        } else if (item.name) {
          await db.sql`
            UPDATE products SET stock = GREATEST(stock - ${item.qty}, 0), updated_at = now()
            WHERE name = ${item.name}
          `;
        }
      } catch (e) {
        // A stock update failing shouldn't fail the webhook — the
        // order is already saved, and stock can be fixed by hand.
        console.error('Stock update failed for', item.slug || item.name, e && e.message);
      }
    }
  }

  return { statusCode: 200, body: 'OK' };
};
