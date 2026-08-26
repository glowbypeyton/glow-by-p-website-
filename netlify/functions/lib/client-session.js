/**
 * client-session.js
 * ---------------------------------------------------------------
 * Signed-cookie sessions for logged-in clients — same pattern as
 * the admin session, but tracks which client is logged in and
 * uses its own secret (CLIENT_SESSION_SECRET) so client and admin
 * sessions can never be mixed up or forged as each other.
 * ------------------------------------------------------------- */

const crypto = require('crypto');

const COOKIE_NAME = 'client_session';
const SESSION_LENGTH_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function sign(payloadB64) {
  const secret = process.env.CLIENT_SESSION_SECRET || '';
  return crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
}

function createClientSessionCookie(client) {
  const payload = { clientId: client.id, email: client.email, exp: Date.now() + SESSION_LENGTH_MS };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign(payloadB64);
  const token = payloadB64 + '.' + signature;
  const maxAge = Math.floor(SESSION_LENGTH_MS / 1000);
  return COOKIE_NAME + '=' + token + '; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=' + maxAge;
}

function clearClientSessionCookie() {
  return COOKIE_NAME + '=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0';
}

function getClientSession(event) {
  const cookieHeader = (event.headers && (event.headers.cookie || event.headers.Cookie)) || '';
  const match = cookieHeader.match(new RegExp('(?:^|; )' + COOKIE_NAME + '=([^;]+)'));
  if (!match) return null;

  const token = decodeURIComponent(match[1]);
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;
  const expectedSignature = sign(payloadB64);

  try {
    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
  } catch (e) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload.clientId || !payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

module.exports = { createClientSessionCookie, clearClientSessionCookie, getClientSession };
