/**
 * get-submissions.js
 * ---------------------------------------------------------------
 * Powers the admin dashboard. Requires a valid admin session
 * cookie (set by admin-login.js) — anyone without it gets a 401.
 *
 * GET  -> returns { contacts: [...], newsletter: [...] }
 * POST -> { action: 'markRead', id } marks a contact submission read
 * ------------------------------------------------------------- */

const { getDatabase } = require('@netlify/database');
const { isValidSession } = require('./lib/admin-session');

exports.handler = async function (event) {
  if (!isValidSession(event)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Not signed in.' }) };
  }

  const db = getDatabase({ connectionString: process.env.DATABASE_CONNECTION_STRING });

  if (event.httpMethod === 'GET') {
    try {
      const contacts = await db.sql`
        SELECT id, name, email, phone, service_interest, message, is_read, created_at
        FROM contact_submissions ORDER BY created_at DESC
      `;
      const newsletter = await db.sql`
        SELECT id, first_name, email, created_at
        FROM newsletter_signups ORDER BY created_at DESC
      `;
      return { statusCode: 200, body: JSON.stringify({ contacts, newsletter }) };
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Could not load submissions.' }) };
    }
  }

  if (event.httpMethod === 'POST') {
    let data;
    try {
      data = JSON.parse(event.body);
    } catch (e) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request.' }) };
    }

    if (data.action === 'markRead' && data.id) {
      try {
        await db.sql`UPDATE contact_submissions SET is_read = TRUE WHERE id = ${data.id}`;
        return { statusCode: 200, body: JSON.stringify({ ok: true }) };
      } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Could not update.' }) };
      }
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Unknown action.' }) };
  }

  return { statusCode: 405, body: 'Method not allowed' };
};
