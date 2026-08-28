/**
 * get-products.js
 * ---------------------------------------------------------------
 * PUBLIC endpoint (no auth) — powers the live shop page. Returns
 * every product, ordered by category then display_order, so
 * shop.html can render its category grids straight from the
 * database instead of hard-coded HTML.
 * ------------------------------------------------------------- */

const { getDatabase } = require('@netlify/database');

exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const db = getDatabase({ connectionString: process.env.DATABASE_CONNECTION_STRING });
    const products = await db.sql`
      SELECT slug, name, category, description, price, price_label, image_url, stock, display_order
      FROM products
      ORDER BY category ASC, display_order ASC, name ASC
    `;
    return {
      statusCode: 200,
      headers: { 'Cache-Control': 'public, max-age=60' },
      body: JSON.stringify({ products })
    };
  } catch (err) {
    console.log('get-products error:', err && err.message, err && err.stack);
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not load products.' }) };
  }
};
