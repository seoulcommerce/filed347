function last4(s) {
  const d = String(s == null ? "" : s).replace(/[^0-9A-Za-z]/g, "");
  if (!d) return "";
  return d.slice(-4);
}
module.exports = { last4 };
