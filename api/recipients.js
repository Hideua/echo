const cors = require("./_cors");

function env() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE;
  const user = process.env.ECHO_USER_ID; // ← твой UUID-владелец
  if (!url || !key || !user) throw new Error("Missing env: need SUPABASE_URL + SUPABASE_SERVICE_ROLE + ECHO_USER_ID");
  return { url, key, user };
}

module.exports = async (req,res) => {
  cors(res);
  if (req.method==="OPTIONS") return res.status(204).end();

  try {
    const { url, key, user } = env();

    if (req.method==="POST") {
      const b = typeof req.body==="string" ? JSON.parse(req.body||"{}") : (req.body||{});
      const name  = (b.name||"").trim();
      const email = (b.email||"").trim().toLowerCase();
      if (!name || !email) return res.status(400).json({ ok:false, error:"name и email обязательны" });

      const payload = { user_id: user, name, email };
      const r = await fetch(`${url}/rest/v1/recipients`, {
        method:"POST",
        headers:{
          apikey:key, Authorization:`Bearer ${key}`,
          "Content-Type":"application/json", Prefer:"return=representation"
        },
        body: JSON.stringify(payload)
      });
      const out = await r.text();
      if (!r.ok) return res.status(500).json({ ok:false, error: out||"Supabase REST error" });
      const data = JSON.parse(out);
      return res.status(201).json({ ok:true, data: Array.isArray(data)?data[0]:data });
    }

    if (req.method==="GET") {
      const r = await fetch(`${url}/rest/v1/recipients?select=id,name,email,created_at&user_id=eq.${user}&order=created_at.desc`, {
        headers:{ apikey:key, Authorization:`Bearer ${key}` }
      });
      const data = await r.json();
      return res.json({ ok:true, data });
    }

    return res.status(405).json({ ok:false, error:"Method Not Allowed" });
  } catch (e) {
    return res.status(500).json({ ok:false, error: e.message||"Internal error" });
  }
};
