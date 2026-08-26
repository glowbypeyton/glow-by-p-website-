/**
 * client-login.js
 * ---------------------------------------------------------------
 * Signs an existing client in.
 * ------------------------------------------------------------- */

const { getDatabase } = require('@netlify/database');
const { verifyPassword } = require('./lib/password');
const { createClientSessionCookie } = require('./lib/client-session');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request.' }) };
  }

  const email = (data.email || '').trim().toLowerCase();
  const password = data.password || '';

  if (!email || !password) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Email and password are required.' }) };
  }

  try {
    const db = getDatabase({ connectionString: process.env.DATABASE_CONNECTION_STRING });
    const rows = await db.sql`
      SELECT id, email, full_name, password_hash, password_salt
      FROM clients WHERE email = ${email}
    `;

    if (rows.length === 0) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Incorrect email or password.' }) };
    }

    const client = rows[0];
    const valid = verifyPassword(password, client.password_hash, client.password_salt);
    if (!valid) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Incorrect email or password.' }) };
    }

    return {
      statusCode: 200,
      headers: { 'Set-Cookie': createClientSessionCookie(client) },
      body: JSON.stringify({ ok: true, fullName: client.full_name })
    };
  } catch (err) {
    console.log('client-login error:', err && err.message, err && err.stack);
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not sign you in. Please try again.' }) };
  }
};
