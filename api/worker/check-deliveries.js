// api/worker/check-deliveries.js
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  RESEND_API_KEY,
  FROM_EMAIL,
  CRON_SECRET,
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Worker requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export default async function handler(req, res) {
  if (CRON_SECRET) {
    const auth = req.headers['authorization'] || req.headers['Authorization'] || '';
    if (auth !== `Bearer ${CRON_SECRET}`) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ ok: false, error: 'Unauthorized' }));
    }
  }

  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
  }

  const nowIso = new Date().toISOString();
  const results = { ok: true, now: nowIso, picked: 0, sent: 0, failed: 0, skipped: 0, errors: [] };

  try {
    const { data: deliveries, error: dErr } = await supabase
      .from('deliveries')
      .select('id, message_id, status, updated_at')
      .eq('status', 'pending')
      .order('updated_at', { ascending: true })
      .limit(100);

    if (dErr) {
      res.statusCode = 500;
      return res.end(JSON.stringify({ ok: false, error: dErr.message }));
    }

    results.picked = deliveries?.length || 0;
    if (!deliveries || deliveries.length === 0) {
      res.statusCode = 200;
      return res.end(JSON.stringify(results));
    }

    for (const d of deliveries) {
      try {
        const { data: message, error: mErr } = await supabase
          .from('messages')
          .select('id, recipient_id, title, content, deliver_at')
          .eq('id', d.message_id)
          .single();

        if (mErr || !message) {
          results.skipped++;
          if (mErr) results.errors.push(`message:${d.id}:${mErr.message}`);
          continue;
        }

        if (!message.deliver_at || message.deliver_at > nowIso) {
          results.skipped++;
          continue;
        }

        const { data: claimed, error: claimErr } = await supabase
          .from('deliveries')
          .update({ status: 'processing' })
          .eq('id', d.id)
          .eq('status', 'pending')
          .select('id')
          .single();

        if (claimErr || !claimed) {
          results.skipped++;
          continue;
        }

        const { data: recipient, error: rErr } = await supabase
          .from('recipients')
          .select('id, email, name')
          .eq('id', message.recipient_id)
          .single();

        if (rErr || !recipient?.email) {
          results.failed++;
          if (rErr) results.errors.push(`recipient:${d.id}:${rErr.message}`);
          await supabase.from('deliveries').update({ status: 'failed' }).eq('id', d.id);
          continue;
        }

        if (!resend || !FROM_EMAIL) {
          await supabase.from('deliveries').update({ status: 'sent' }).eq('id', d.id);
          results.sent++;
          continue;
        }

        const subject = message.title || 'Echo message';
        const html = `
          <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif;line-height:1.6">
            <h2 style="margin:0 0 12px">${subject}</h2>
            <p>From: Echo</p>
            <hr/>
            <div>${String(message.content).replace(/\n/g,'<br/>')}</div>
          </div>
        `;

        const sent = await resend.emails.send({
          from: FROM_EMAIL,
          to: recipient.email,
          subject,
          html,
        });

        if (sent?.id || sent?.data?.id) {
          await supabase.from('deliveries').update({ status: 'sent' }).eq('id', d.id);
          results.sent++;
        } else {
          await supabase.from('deliveries').update({ status: 'failed' }).eq('id', d.id);
          results.failed++;
          results.errors.push(`send:${d.id}:no-id`);
        }
      } catch (e) {
        results.failed++;
        results.errors.push(`loop:${d.id}:${String(e?.message ?? e)}`);
        await supabase.from('deliveries').update({ status: 'pending' }).eq('id', d.id).eq('status', 'processing');
      }
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(results));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: String(e?.message ?? e) }));
  }
}
