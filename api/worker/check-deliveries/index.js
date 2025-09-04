// api/worker/check-deliveries/index.js
// Node.js Serverless Function for Vercel (НЕ Next.js app/api)
// Триггеры: deliver_at ИЛИ Smart Life Check (grace_minutes). Auth: Bearer CRON_SECRET.

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Echo <no-reply@echo.local>';
const CRON_SECRET = process.env.CRON_SECRET;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}
function authOk(req) {
  const h = req.headers['authorization'] || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m && m[1] && CRON_SECRET && m[1] === CRON_SECRET;
}
function nowIso() { return new Date().toISOString(); }

async function sendEmail({ to, subject, text }) {
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, text }),
  });
  if (!resp.ok) {
    const t = await resp.text().catch(() => '');
    throw new Error(`Resend HTTP ${resp.status}: ${t}`);
  }
  return await resp.json();
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Use POST' });
  if (!authOk(req)) return json(res, 401, { ok: false, error: 'Unauthorized' });
  if (!SUPABASE_URL || !SERVICE_ROLE) return json(res, 500, { ok: false, error: 'Supabase env missing' });

  const supa = createClient(SUPABASE_URL, SERVICE_ROLE);
  const result = { ok: true, now: nowIso(), picked: 0, sent: 0, failed: 0, skipped: 0, errors: [] };

  try {
    const { data: pendings, error: pendErr } = await supa
      .from('deliveries')
      .select('id, user_id, message_id, recipient_id, status, updated_at')
      .eq('status', 'pending')
      .order('updated_at', { ascending: true })

# 1) перейти в бэкенд-репо (если нет — клонируй)
cd C:/Projects
if [ ! -d "echo" ]; then git clone https://github.com/Hideua/echo.git; fi
cd echo

# (необязательно) подчистить мусор в фронтенде — это не наш репо:
# rm -f C:/Projects/echo-frontend/apiworkercheck-deliveriesindex.js

# 2) структура для воркера
mkdir -p api/worker/check-deliveries

# 3) index.js — полный файл
cat > api/worker/check-deliveries/index.js <<'EOF'
// api/worker/check-deliveries/index.js
// Node.js Serverless Function for Vercel (НЕ Next.js app/api)
// Триггеры: deliver_at ИЛИ Smart Life Check (grace_minutes). Auth: Bearer CRON_SECRET.

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Echo <no-reply@echo.local>';
const CRON_SECRET = process.env.CRON_SECRET;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}
function authOk(req) {
  const h = req.headers['authorization'] || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m && m[1] && CRON_SECRET && m[1] === CRON_SECRET;
}
function nowIso() { return new Date().toISOString(); }

async function sendEmail({ to, subject, text }) {
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, text }),
  });
  if (!resp.ok) {
    const t = await resp.text().catch(() => '');
    throw new Error(`Resend HTTP ${resp.status}: ${t}`);
  }
  return await resp.json();
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Use POST' });
  if (!authOk(req)) return json(res, 401, { ok: false, error: 'Unauthorized' });
  if (!SUPABASE_URL || !SERVICE_ROLE) return json(res, 500, { ok: false, error: 'Supabase env missing' });

  const supa = createClient(SUPABASE_URL, SERVICE_ROLE);
  const result = { ok: true, now: nowIso(), picked: 0, sent: 0, failed: 0, skipped: 0, errors: [] };

  try {
    const { data: pendings, error: pendErr } = await supa
      .from('deliveries')
      .select('id, user_id, message_id, recipient_id, status, updated_at')
      .eq('status', 'pending')
      .order('updated_at', { ascending: true })
      .limit(50);
    if (pendErr) throw pendErr;

    for (const d of pendings || []) {
      try {
        const [{ data: msg, error: msgErr }, { data: rec, error: recErr }] = await Promise.all([
          supa.from('messages')
            .select('id, user_id, title, body_text, media_key, deliver_at, lifecheck_enabled')
            .eq('id', d.message_id).single(),
          supa.from('recipients')
            .select('id, email, name')
            .eq('id', d.recipient_id).single(),
        ]);
        if (msgErr) throw msgErr;
        if (recErr) throw recErr;

        const now = Date.now();
        let dueByTime = false;
        if (msg.deliver_at) {
          const t = new Date(msg.deliver_at).getTime();
          if (!Number.isNaN(t) && t <= now) dueByTime = true;
        }

        let dueByLifecheck = false;
        if (msg.lifecheck_enabled) {
          const { data: lc, error: lcErr } = await supa
            .from('lifecheck_settings')
            .select('last_ping_at, grace_minutes')
            .eq('user_id', d.user_id)
            .maybeSingle();
          if (lcErr) throw lcErr;

          if (!lc || !lc.last_ping_at) {
            dueByLifecheck = true;
          } else {
            const last = new Date(lc.last_ping_at).getTime();
            const graceMs = (lc.grace_minutes ?? 4320) * 60 * 1000;
            if (!Number.isNaN(last) && now - last >= graceMs) dueByLifecheck = true;
          }
        }

        if (!dueByTime && !dueByLifecheck) { result.skipped++; continue; }

        const { data: picked, error: pickErr } = await supa
          .from('deliveries')
          .update({ status: 'processing', updated_at: nowIso(), last_error: null })
          .eq('id', d.id).eq('status', 'pending')
          .select('id').single();
        if (pickErr || !picked) { result.skipped++; continue; }
        result.picked++;

        let mediaLine = '';
        if (msg.media_key) {
          const { data: signed, error: signErr } = await supa.storage
            .from('echo-uploads')
            .createSignedUrl(msg.media_key, 60 * 60 * 24 * 7);
          mediaLine = signErr
            ? `\n\n[Вложение недоступно: ${signErr.message}]`
            : `\n\nAttachment:\n${signed.signedUrl}`;
        }

        const subject = `Echo • ${msg.title}`;
        const text = (msg.body_text ? `${msg.body_text}\n\n` : '') + `— This message was delivered by Echo.` + mediaLine;

        await sendEmail({ to: rec.email, subject, text });

        const { error: updErr } = await supa
          .from('deliveries')
          .update({ status: 'sent', updated_at: nowIso(), last_error: null })
          .eq('id', d.id);
        if (updErr) throw updErr;

        result.sent++;
      } catch (e) {
        const m = e && e.message ? e.message : String(e);
        result.failed++;
        result.errors.push({ id: d.id, error: m });
        await supa.from('deliveries')
          .update({ status: 'failed', updated_at: nowIso(), last_error: m.slice(0, 1000) })
          .eq('id', d.id);
      }
    }

    return json(res, 200, result);
  } catch (e) {
    const m = e && e.message ? e.message : String(e);
    result.ok = false;
    result.errors.push({ fatal: m });
    return json(res, 500, result);
  }
};
