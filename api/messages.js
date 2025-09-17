const cors = require("./_cors");

function env() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) throw new Error("Missing env: need SUPABASE_URL + SUPABASE_SERVICE_ROLE");
  return { url, key };
}

module.exports = async (req,res) => {
  cors(res);
  if (req.method==="OPTIONS") return res.status(204).end();

  if (req.method!=="POST") return res.status(405).json({ ok:false, error:"Method Not Allowed" });

  try {
    const { url, key } = env();
    const raw = typeof req.body==="string" ? req.body : JSON.stringify(req.body||{});
    const b = raw ? JSON.parse(raw) : {};
    const recipient_id = b.recipient_id || b.recipientId;
    const content = (b.body ?? b.text ?? "").toString();
    let title = (b.title ?? b.subject ?? "").toString().trim();

    if (!recipient_id || !content) return res.status(400).json({ ok:false, error:"recipient_id и body обязательны" });
    if (!title) title = content.replace(/\s+/g," ").slice(0,80) || "Без темы";

    // lookup user_id
    const qs = new URLSearchParams({ select:"user_id", id:`eq.${recipient_id}` }).toString();
    const r1 = await fetch(`${url}/rest/v1/recipients?${qs}`, {
      headers:{ apikey:key, Authorization:`Bearer ${key}` }
    });
    const recs = await r1.json();
    const user_id = recs?.[0]?.user_id;
    if (!user_id) return res.status(400).json({ ok:false, error:"recipient not found or has no user_id" });

    const payload = { recipient_id, user_id, title, body: content };

    const r2 = await fetch(`${url}/rest/v1/messages`,{
      method:"POST",
      headers:{ apikey:key, Authorization:`Bearer ${key}`, "Content-Type":"application/json", Prefer:"return=representation" },
      body: JSON.stringify(payload)
    });
    const out = await r2.text();
    if (!r2.ok) return res.status(500).json({ ok:false, error: out||"Supabase REST error" });
    const data = JSON.parse(out);
    res.status(201).json({ ok:true, data: Array.isArray(data)?data[0]:data });
  } catch (e) {
    res.status(500).json({ ok:false, error:e.message||"Internal error" });
  }
};
