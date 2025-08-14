// api/deliveries.js
import { supabaseAdmin, json, withCors } from './_supabase.js';

export default withCors(async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return json(res, 405, { ok: false, error: 'Method Not Allowed' });
  }
  const status = req.query?.status || null;
  const since = req.query?.since || null;
  const limit = Math.min(parseInt(req.query?.limit ?? '100', 10) || 100, 500);

  let q = supabaseAdmin
    .from('deliveries')
    .select('id, message_id, status, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (status) q = q.eq('status', status);
  if (since) q = q.gte('updated_at', since);

  const { data, error } = await q;
  if (error) return json(res, 500, { ok: false, error: error.message });
  return json(res, 200, { ok: true, items: data });
});
