// api/messages.js
import { supabaseAdmin, json, withCors, readJson } from './_supabase.js';

function toIso(x) {
  if (!x) return null;
  const d = new Date(x);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export default withCors(async function handler(req, res) {
  if (!supabaseAdmin) return json(res, 500, { ok: false, error: 'SERVICE_ROLE key is not configured' });

  if (req.method === 'POST') {
    const body = await readJson(req);
    const { recipient_id, title, content } = body || {};
    const deliver_at = toIso(body?.deliver_at);

    if (!recipient_id || !title || !content) {
      return json(res, 400, { ok: false, error: 'recipient_id, title, content are required' });
    }
    if (!deliver_at) {
      return json(res, 400, { ok: false, error: 'deliver_at must be a valid date/time' });
    }

    const { data: msg, error: mErr } = await supabaseAdmin
      .from('messages')
      .insert({ recipient_id, title, content, deliver_at })
      .select('id, recipient_id, title, content, deliver_at, created_at')
      .single();

    if (mErr) return json(res, 500, { ok: false, error: mErr.message });

    const { error: dErr } = await supabaseAdmin
      .from('deliveries')
      .insert({ message_id: msg.id, status: 'pending' });

    if (dErr) {
      return json(res, 500, { ok: false, error: 'Message created but failed to create delivery: ' + dErr.message });
    }

    return json(res, 201, { ok: true, item: msg });
  }

  if (req.method === 'GET') {
    const limit = Math.min(parseInt(req.query?.limit ?? '100', 10) || 100, 500);
    const recipient_id = req.query?.recipient_id || null;

    let q = supabaseAdmin
      .from('messages')
      .select('id, recipient_id, title, content, deliver_at, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (recipient_id) q = q.eq('recipient_id', recipient_id);

    const { data, error } = await q;
    if (error) return json(res, 500, { ok: false, error: error.message });
    return json(res, 200, { ok: true, items: data });
  }

  res.setHeader('Allow', 'GET, POST, OPTIONS');
  return json(res, 405, { ok: false, error: 'Method Not Allowed' });
});
