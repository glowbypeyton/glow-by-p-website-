/**
 * get-orders.js
 * ---------------------------------------------------------------
 * Powers the admin Orders page. Requires a valid admin session
 * cookie (set by admin-login.js) — anyone without it gets a 401.
 *
 * GET -> returns { orders: [...] }, newest first.
 * ------------------------------------------------------------- */

const { getDatabase } = require('@netlify/database');
const { isValidSession } = require('./lib/admin-session');

exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  if (!isValidSession(event)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Not signed in.' }) };
  }

  const db = getDatabase({ connectionString: process.env.DATABASE_CONNECTION_STRING });

  try {
    const orders = await db.sql`
      SELECT id, square_order_id, square_payment_id, customer_name, customer_email, items, total_amount, status, created_at
      FROM orders ORDER BY created_at DESC
    `;
    return { statusCode: 200, body: JSON.stringify({ orders }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not load orders.' }) };
  }
};
