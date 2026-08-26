const { clearSessionCookie } = require('./lib/admin-session');

exports.handler = async function () {
  return {
    statusCode: 200,
    headers: { 'Set-Cookie': clearSessionCookie() },
    body: JSON.stringify({ ok: true })
  };
};
