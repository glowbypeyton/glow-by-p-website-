/**
 * submit-newsletter.js
 * ---------------------------------------------------------------
 * Saves a "Glow Note" newsletter signup to the database. Uses
 * ON CONFLICT so re-signing-up with the same email just updates
 * their name instead of erroring.
 * ------------------------------------------------------------- */

const { getDatabase } = require('@netlify/database');

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

  const firstName = (data.firstName || '').trim();
  const email = (data.email || '').trim();

  if (!email) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Email is required.' }) };
  }

  try {
    const db = getDatabase({ connectionString: process.env.DATABASE_CONNECTION_STRING });
    await db.sql`
      INSERT INTO newsletter_signups (first_name, email)
      VALUES (${firstName}, ${email})
      ON CONFLICT (email) DO UPDATE SET first_name = EXCLUDED.first_name
    `;
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.log('submit-newsletter error:', err && err.message, err && err.stack);
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not sign you up. Please try again.' }) };
  }
};
