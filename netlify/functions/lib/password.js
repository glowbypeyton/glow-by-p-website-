/**
 * password.js
 * ---------------------------------------------------------------
 * Password hashing using Node's built-in scrypt — no extra
 * dependency to install or go wrong. Each password gets its own
 * random salt, so two clients with the same password still get
 * completely different stored hashes.
 * ------------------------------------------------------------- */

const crypto = require('crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, storedHash, storedSalt) {
  const hashToCompare = crypto.scryptSync(password, storedSalt, 64).toString('hex');
  try {
    const a = Buffer.from(storedHash, 'hex');
    const b = Buffer.from(hashToCompare, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (e) {
    return false;
  }
}

module.exports = { hashPassword, verifyPassword };
