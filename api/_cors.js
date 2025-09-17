module.exports = (res) => {
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Vary","Origin");
  res.setHeader("Access-Control-Allow-Methods","GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type, Authorization, X-Requested-With");
  res.setHeader("Access-Control-Max-Age","86400");
};
