/**
 * admin-client-detail.js
 * ---------------------------------------------------------------
 * Powers the "manage one client" screen for the admin.
 *
 * GET  ?id=123  -> { client, notes: [...] }
 * POST { action: 'updateRoutine', clientId, amRoutine, pmRoutine }
 * POST { action: 'addNote', clientId, note, photoUrl }
 * ------------------------------------------------------------- */

const { getDatabase } = require('@netlify/database');
const { isValidSession } = require('./lib/admin-session');

exports.handler = async function (event) {
  if (!isValidSession(event)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Not signed in.' }) };
  }

  const db = getDatabase({ connectionString: process.env.DATABASE_CONNECTION_STRING });

  if (event.httpMethod === 'GET') {
    const clientId = event.queryStringParameters && event.queryStringParameters.id;
    if (!clientId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing client id.' }) };
    }
    try {
      const clients = await db.sql`
        SELECT id, full_name, email, phone, am_routine, pm_routine, created_at
        FROM clients WHERE id = ${clientId}
      `;
      if (clients.length === 0) {
        return { statusCode: 404, body: JSON.stringify({ error: 'Client not found.' }) };
      }
      const notes = await db.sql`
        SELECT id, note, photo_url, created_at
        FROM visit_notes WHERE client_id = ${clientId} ORDER BY created_at DESC
      `;
      return { statusCode: 200, body: JSON.stringify({ client: clients[0], notes }) };
    } catch (err) {
      console.log('admin-client-detail GET error:', err && err.message, err && err.stack);
      return { statusCode: 500, body: JSON.stringify({ error: 'Could not load client.' }) };
    }
  }

  if (event.httpMethod === 'POST') {
    let data;
    try {
      data = JSON.parse(event.body);
    } catch (e) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request.' }) };
    }

    if (data.action === 'updateRoutine') {
      const { clientId, amRoutine, pmRoutine } = data;
      if (!clientId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing client id.' }) };
      }
      try {
        await db.sql`
          UPDATE clients SET am_routine = ${amRoutine || ''}, pm_routine = ${pmRoutine || ''}
          WHERE id = ${clientId}
        `;
        return { statusCode: 200, body: JSON.stringify({ ok: true }) };
      } catch (err) {
        console.log('admin-client-detail updateRoutine error:', err && err.message, err && err.stack);
        return { statusCode: 500, body: JSON.stringify({ error: 'Could not save routine.' }) };
      }
    }

    if (data.action === 'addNote') {
      const { clientId, note, photoUrl } = data;
      if (!clientId || (!note && !photoUrl)) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Add a note or a photo link.' }) };
      }
      try {
        await db.sql`
          INSERT INTO visit_notes (client_id, note, photo_url)
          VALUES (${clientId}, ${note || ''}, ${photoUrl || ''})
        `;
        return { statusCode: 200, body: JSON.stringify({ ok: true }) };
      } catch (err) {
        console.log('admin-client-detail addNote error:', err && err.message, err && err.stack);
        return { statusCode: 500, body: JSON.stringify({ error: 'Could not save note.' }) };
      }
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Unknown action.' }) };
  }

  return { statusCode: 405, body: 'Method not allowed' };
};
