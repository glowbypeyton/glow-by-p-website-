/**
 * client-signup.js
 * ---------------------------------------------------------------
 * Creates a new client account. Passwords are hashed (never
 * stored in plain text) using Node's built-in scrypt.
 * ------------------------------------------------------------- */

const { getDatabase } = require('@netlify/database');
const { hashPassword } = require('./lib/password');
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

  const fullName = (data.fullName || '').trim();
  const email = (data.email || '').trim().toLowerCase();
  const phone = (data.phone || '').trim();
  const password = data.password || '';

  if (!fullName || !email || !password) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Name, email, and password are required.' }) };
  }
  if (password.length < 8) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Password must be at least 8 characters.' }) };
  }

  const { hash, salt } = hashPassword(password);

  try {
    const db = getDatabase({ connectionString: process.env.DATABASE_CONNECTION_STRING });

    const existing = await db.sql`SELECT id FROM clients WHERE email = ${email}`;
    if (existing.length > 0) {
      return { statusCode: 409, body: JSON.stringify({ error: 'An account with that email already exists. Try signing in instead.' }) };
    }

    const inserted = await db.sql`
      INSERT INTO clients (full_name, email, phone, password_hash, password_salt)
      VALUES (${fullName}, ${email}, ${phone}, ${hash}, ${salt})
      RETURNING id, email, full_name
    `;
    const client = inserted[0];

    return {
      statusCode: 200,
      headers: { 'Set-Cookie': createClientSessionCookie(client) },
      body: JSON.stringify({ ok: true, fullName: client.full_name })
    };
  } catch (err) {
    console.log('client-signup error:', err && err.message, err && err.stack);
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not create your account. Please try again.' }) };
  }
};
