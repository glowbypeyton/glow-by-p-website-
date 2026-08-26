/**
 * client-me.js
 * ---------------------------------------------------------------
 * Confirms who's logged in and returns their basic info. The
 * dashboard calls this on load — a 401 means "not logged in,
 * redirect to client-portal.html."
 * ------------------------------------------------------------- */

const { getDatabase } = require('@netlify/database');
const { getClientSession } = require('./lib/client-session');

exports.handler = async function (event) {
  const session = getClientSession(event);
  if (!session) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Not signed in.' }) };
  }

  try {
    const db = getDatabase({ connectionString: process.env.DATABASE_CONNECTION_STRING });
    const rows = await db.sql`
      SELECT id, full_name, email, phone, created_at FROM clients WHERE id = ${session.clientId}
    `;
    if (rows.length === 0) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Account not found.' }) };
    }
    return { statusCode: 200, body: JSON.stringify({ client: rows[0] }) };
  } catch (err) {
    console.log('client-me error:', err && err.message, err && err.stack);
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not load your account.' }) };
  }
};
