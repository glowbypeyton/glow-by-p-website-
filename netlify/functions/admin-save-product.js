/**
 * admin-save-product.js
 * ---------------------------------------------------------------
 * Creates or updates one product. Requires a valid admin session
 * cookie. Used by admin-products.html for both "Add Product" and
 * "Edit Product".
 *
 * POST body:
 *   {
 *     originalSlug,   // omit when creating a new product; the
 *                      // product's current slug when editing one
 *                      // (lets you rename the slug itself)
 *     slug, name, category, description,
 *     price, priceLabel, imageUrl, stock, displayOrder
 *   }
 * ------------------------------------------------------------- */

const { getDatabase } = require('@netlify/database');
const { isValidSession } = require('./lib/admin-session');

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

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

  const name = String(data.name || '').trim();
  const category = String(data.category || '').trim();
  const slug = slugify(data.slug || name);
  const description = String(data.description || '').trim();
  const price = Number(data.price);
  const priceLabel = data.priceLabel ? String(data.priceLabel).trim() : null;
  const imageUrl = String(data.imageUrl || '').trim();
  const stock = parseInt(data.stock, 10);
  const displayOrder = parseInt(data.displayOrder, 10) || 0;
  const originalSlug = data.originalSlug ? String(data.originalSlug).trim() : null;

  if (!name || !category || !slug) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Name and category are required.' }) };
  }
  if (Number.isNaN(price) || price < 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Price must be a positive number.' }) };
  }
  if (Number.isNaN(stock) || stock < 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Stock must be a whole number, 0 or more.' }) };
  }

  const db = getDatabase({ connectionString: process.env.DATABASE_CONNECTION_STRING });

  try {
    if (originalSlug) {
      const result = await db.sql`
        UPDATE products SET
          slug = ${slug}, name = ${name}, category = ${category},
          description = ${description}, price = ${price}, price_label = ${priceLabel},
          image_url = ${imageUrl}, stock = ${stock}, display_order = ${displayOrder},
          updated_at = now()
        WHERE slug = ${originalSlug}
        RETURNING slug
      `;
      if (result.length === 0) {
        return { statusCode: 404, body: JSON.stringify({ error: 'Product not found.' }) };
      }
    } else {
      await db.sql`
        INSERT INTO products (slug, name, category, description, price, price_label, image_url, stock, display_order)
        VALUES (${slug}, ${name}, ${category}, ${description}, ${price}, ${priceLabel}, ${imageUrl}, ${stock}, ${displayOrder})
      `;
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true, slug: slug }) };
  } catch (err) {
    console.log('admin-save-product error:', err && err.message, err && err.stack);
    if (err && /unique/i.test(err.message || '')) {
      return { statusCode: 409, body: JSON.stringify({ error: 'That product URL (slug) is already taken by another product.' }) };
    }
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not save product.' }) };
  }
};
