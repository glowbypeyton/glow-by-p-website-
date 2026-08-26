/**
 * admin-session.js
 * ---------------------------------------------------------------
 * Lightweight signed-cookie sessions for the admin dashboard —
 * no extra auth library needed, just Node's built-in crypto.
 *
 * The cookie holds a base64 JSON payload plus an HMAC signature
 * (signed with ADMIN_SESSION_SECRET, set in Netlify env vars).
 * Anyone without that secret cannot forge a valid cookie.
 * ------------------------------------------------------------- */

const crypto = require('crypto');

const COOKIE_NAME = 'admin_session';
const SESSION_LENGTH_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function sign(payloadB64) {
  const secret = process.env.ADMIN_SESSION_SECRET || '';
  return crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
}

function createSessionCookie() {
  const payload = { admin: true, exp: Date.now() + SESSION_LENGTH_MS };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign(payloadB64);
  const token = payloadB64 + '.' + signature;
  const maxAge = Math.floor(SESSION_LENGTH_MS / 1000);
  return COOKIE_NAME + '=' + token + '; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=' + maxAge;
}

function clearSessionCookie() {
  return COOKIE_NAME + '=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0';
}

function isValidSession(event) {
  const cookieHeader = (event.headers && (event.headers.cookie || event.headers.Cookie)) || '';
  const match = cookieHeader.match(new RegExp('(?:^|; )' + COOKIE_NAME + '=([^;]+)'));
  if (!match) return false;

  const token = decodeURIComponent(match[1]);
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [payloadB64, signature] = parts;
  const expectedSignature = sign(payloadB64);

  try {
    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expectedBuf.length) return false;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return false;
  } catch (e) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload.admin) return false;
    if (!payload.exp || Date.now() > payload.exp) return false;
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = { createSessionCookie, clearSessionCookie, isValidSession };
