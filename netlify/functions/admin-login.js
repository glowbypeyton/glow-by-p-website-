/**
 * admin-login.js
 * ---------------------------------------------------------------
 * Checks the submitted email/password against ADMIN_EMAIL and
 * ADMIN_PASSWORD (set in Netlify env vars — never in code). On a
 * match, issues a signed session cookie the dashboard uses to
 * prove it's really Peyton on every later request.
 * ------------------------------------------------------------- */

const crypto = require('crypto');
const { createSessionCookie } = require('./lib/admin-session');

function safeEqual(a, b) {
  const aBuf = Buffer.from(String(a));
  const bBuf = Buffer.from(String(b));
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;

  if (!adminEmail || !adminPassword || !sessionSecret) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Admin login is not configured yet. Add ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_SESSION_SECRET in Netlify site settings.'
      })
    };
  }

  let email, password;
  try {
    const body = JSON.parse(event.body);
    email = body.email;
    password = body.password;
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request.' }) };
  }

  if (!email || !password) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Email and password are required.' }) };
  }

  const emailMatches = safeEqual(String(email).trim().toLowerCase(), adminEmail.trim().toLowerCase());
  const passwordMatches = safeEqual(password, adminPassword);

  if (!emailMatches || !passwordMatches) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Incorrect email or password.' }) };
  }

  return {
    statusCode: 200,
    headers: { 'Set-Cookie': createSessionCookie() },
    body: JSON.stringify({ ok: true })
  };
};
