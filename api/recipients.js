// api/recipients.js
import { supabaseAdmin, json, withCors, readJson } from './_supabase.js';

function isEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export default withCors(async function handler(req, res) {
  if (!supabaseAdmin) return json(res, 500, { ok: false, error: 'SERVICE_ROLE key is not configured' });

  if (req.method === 'POST') {
    const body = await readJson(req);
    const email = body?.email?.trim();
    const name = (body?.name || '').toString().trim();

    if (!isEmail(email)) return json(res, 400, { ok: false, error: 'Valid email is required' });

    const { data, error } = await supabaseAdmin
      .from('recipients')
      .insert({ email, name: name || null })
      .select('id, email, name, created_at')
      .single();

    if (error) return json(res, 500, { ok: false, error: error.message });
    return json(res, 201, { ok: true, item: data });
  }

  if (req.method === 'GET') {
    const limit = Math.min(parseInt(req.query?.limit ?? '100', 10) || 100, 500);
    const { data, error } = await supabaseAdmin
      .from('recipients')
      .select('id, email, name, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return json(res, 500, { ok: false, error: error.message });
    return json(res, 200, { ok: true, items: data });
  }

  res.setHeader('Allow', 'GET, POST, OPTIONS');
  return json(res, 405, { ok: false, error: 'Method Not Allowed' });
});
