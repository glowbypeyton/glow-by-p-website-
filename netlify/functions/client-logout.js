const { clearClientSessionCookie } = require('./lib/client-session');

exports.handler = async function () {
  return {
    statusCode: 200,
    headers: { 'Set-Cookie': clearClientSessionCookie() },
    body: JSON.stringify({ ok: true })
  };
};
