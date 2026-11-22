/**
 * get-products.js
 * ---------------------------------------------------------------
 * PUBLIC endpoint (no auth) — powers the live shop page. Returns
 * every product, ordered by category then display_order, so
 * shop.html can render its category grids straight from the
 * database instead of hard-coded HTML.
 * ------------------------------------------------------------- */

const { getDatabase } = require('@netlify/database');
const { SALE, isSaleActive, appliesTo, salePrice } = require('./lib/sale');

exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  // ?preview=sale shows sale pricing before the sale starts, for
  // checking how the shop will look. Display only — checkout always
  // uses the real sale dates (create-checkout.js).
  const preview = !!(event.queryStringParameters && event.queryStringParameters.preview === 'sale');
  const saleOn = preview || isSaleActive();

  try {
    const db = getDatabase({ connectionString: process.env.DATABASE_CONNECTION_STRING });
    const rows = await db.sql`
      SELECT slug, name, category, description, price, price_label, image_url, stock, display_order, featured
      FROM products
      ORDER BY category ASC, display_order ASC, name ASC
    `;
    const products = rows.map(function (p) {
      return Object.assign({}, p, {
        sale_price: saleOn && appliesTo(p) ? salePrice(p.price) : null
      });
    });
    const sale = saleOn
      ? { active: true, name: SALE.name, percent: SALE.percent, end: SALE.end, preview: preview && !isSaleActive() }
      : { active: false };
    return {
      statusCode: 200,
      headers: { 'Cache-Control': 'public, max-age=60' },
      body: JSON.stringify({ products, sale })
    };
  } catch (err) {
    console.log('get-products error:', err && err.message, err && err.stack);
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not load products.' }) };
  }
};
