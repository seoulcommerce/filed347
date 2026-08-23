const { list, put, get } = require("@vercel/blob");

module.exports = async (req, res) => {
  try {
    const action = req.query.action || "list";
    
    if (action === "list") {
      const { blobs } = await list({ limit: 10, prefix: "filed347/" });
      return res.json({ count: blobs.length, blobs: blobs.map(b => ({ pathname: b.pathname, size: b.size })) });
    }
    
    if (action === "test-put") {
      const testId = "test-" + Date.now();
      const result = await put(`filed347/test/${testId}.txt`, "test content", {
        access: "private",
        addRandomSuffix: false
      });
      return res.json({ success: true, pathname: result.pathname, url: result.url });
    }
    
    if (action === "test-get" && req.query.pathname) {
      const result = await get(req.query.pathname, { access: "private" });
      if (!result) {
        return res.json({ found: false });
      }
      return res.json({ 
        found: true, 
        hasStream: !!result.stream,
        hasText: typeof result.text,
        hasArrayBuffer: typeof result.arrayBuffer,
        keys: Object.keys(result)
      });
    }
    
    res.json({ error: "invalid_action", available: ["list", "test-put", "test-get"] });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
};
