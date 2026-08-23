const crypto = require("crypto");

const TTL_MS = 24 * 60 * 60 * 1000;
const previewUsage = new Map();

function sweep() {
  const now = Date.now();
  for (const [k, v] of previewUsage) {
    if (now - v > TTL_MS) {
      previewUsage.delete(k);
    }
  }
}

function hash(ip) {
  return crypto.createHash("sha256").update(String(ip || "unknown")).digest("hex");
}

function hasUsedPreview(ip) {
  sweep();
  const key = hash(ip);
  return previewUsage.has(key);
}

function markPreviewUsed(ip) {
  sweep();
  const key = hash(ip);
  previewUsage.set(key, Date.now());
}

function resetForTesting() {
  previewUsage.clear();
}

module.exports = { hasUsedPreview, markPreviewUsed, resetForTesting, TTL_MS };
