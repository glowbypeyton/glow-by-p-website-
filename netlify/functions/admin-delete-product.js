/**
 * admin-delete-product.js
 * ---------------------------------------------------------------
 * Permanently deletes one product. Requires a valid admin session
 * cookie.
 *
 * POST body: { slug }
 * ------------------------------------------------------------- */

const { getDatabase } = require('@netlify/database');
const { isValidSession } = require('./lib/admin-session');

exports.handler = async function (event) {
  if (!isValidSession(event)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Not signed in.' }) };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request.' }) };
  }

  const slug = String(data.slug || '').trim();
  if (!slug) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing product slug.' }) };
  }

  try {
    const db = getDatabase({ connectionString: process.env.DATABASE_CONNECTION_STRING });
    await db.sql`DELETE FROM products WHERE slug = ${slug}`;
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.log('admin-delete-product error:', err && err.message, err && err.stack);
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not delete product.' }) };
  }
};
