// api/health.js
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: true, message: 'API is running', time: new Date().toISOString() }));
}
