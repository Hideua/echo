const cors = require("./_cors");
module.exports = (req,res)=>{ cors(res);
  if(req.method==="OPTIONS") return res.status(204).end();
  res.json({ ok:true, time:new Date().toISOString(), version:"echo bootstrap v1" });
};
