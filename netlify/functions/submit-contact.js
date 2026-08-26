/**
 * submit-contact.js
 * ---------------------------------------------------------------
 * Saves a Contact page submission to the database so it actually
 * reaches Peyton (previously the form just showed a fake success
 * message and the message went nowhere). View submissions in the
 * admin dashboard at /admin-dashboard.html.
 * ------------------------------------------------------------- */

const { getDatabase } = require('@netlify/database');

exports.handler = async function (event) {
  console.log('submit-contact invoked. method:', event.httpMethod, 'body:', event.body);

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request.' }) };
  }

  const name = (data.name || '').trim();
  const email = (data.email || '').trim();
  const phone = (data.phone || '').trim();
  const service = (data.service || '').trim();
  const message = (data.message || '').trim();

  if (!name || !email) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Name and email are required.' }) };
  }

  try {
    const db = getDatabase();
    await db.sql`
      INSERT INTO contact_submissions (name, email, phone, service_interest, message)
      VALUES (${name}, ${email}, ${phone}, ${service}, ${message})
    `;
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.log('submit-contact error:', err && err.message, err && err.stack);
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not save your message. Please try again.' }) };
  }
};
