const API = (window.ECHO_CONFIG && window.ECHO_CONFIG.API_BASE) || "";
export async function createRecipient(p){
  const r = await fetch(`${API}/api/recipients`,{ method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(p) });
  const j = await r.json(); if(!r.ok||!j.ok) throw new Error(j.error||r.status); return j.data||j.recipient||j;
}
export async function listRecipients(){
  const r = await fetch(`${API}/api/recipients`); const j = await r.json(); if(!r.ok||!j.ok) throw new Error(j.error||r.status); return j.data;
}
export async function createMessage(p){
  const r = await fetch(`${API}/api/messages`,{ method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(p) });
  const j = await r.json(); if(!r.ok||!j.ok) throw new Error(j.error||r.status); return j.data||j.message||j;
}
