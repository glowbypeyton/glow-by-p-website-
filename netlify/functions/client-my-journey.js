/**
 * client-my-journey.js
 * ---------------------------------------------------------------
 * Returns the logged-in client's own routine and visit note/photo
 * timeline, for the client-dashboard.html page. Read-only — only
 * admin can add or edit this data.
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
    const clients = await db.sql`
      SELECT am_routine, pm_routine FROM clients WHERE id = ${session.clientId}
    `;
    const notes = await db.sql`
      SELECT id, note, photo_url, created_at
      FROM visit_notes WHERE client_id = ${session.clientId} ORDER BY created_at DESC
    `;
    return {
      statusCode: 200,
      body: JSON.stringify({
        amRoutine: (clients[0] && clients[0].am_routine) || '',
        pmRoutine: (clients[0] && clients[0].pm_routine) || '',
        notes: notes
      })
    };
  } catch (err) {
    console.log('client-my-journey error:', err && err.message, err && err.stack);
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not load your journey.' }) };
  }
};
