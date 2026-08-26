/**
 * admin-get-clients.js
 * ---------------------------------------------------------------
 * Returns the list of all clients for the admin dashboard's
 * "Clients" tab. Requires a valid admin session cookie.
 * ------------------------------------------------------------- */

const { getDatabase } = require('@netlify/database');
const { isValidSession } = require('./lib/admin-session');

exports.handler = async function (event) {
  if (!isValidSession(event)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Not signed in.' }) };
  }

  try {
    const db = getDatabase({ connectionString: process.env.DATABASE_CONNECTION_STRING });
    const clients = await db.sql`
      SELECT id, full_name, email, phone, created_at
      FROM clients ORDER BY full_name ASC
    `;
    return { statusCode: 200, body: JSON.stringify({ clients }) };
  } catch (err) {
    console.log('admin-get-clients error:', err && err.message, err && err.stack);
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not load clients.' }) };
  }
};
