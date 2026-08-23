const { json } = require("../lib-stripe");

module.exports = async function handler(req, res) {
  try {
    const { getCache } = require("@vercel/functions");
    const cache = getCache({ namespace: "filed347-test" });
    
    const testKey = "test-" + Date.now();
    const testValue = "Hello from cache!";
    
    await cache.set(testKey, testValue, { ttl: 3600 });
    
    const retrieved = await cache.get(testKey);
    
    json(res, 200, {
      success: true,
      testKey,
      setValue: testValue,
      getValue: retrieved,
      match: testValue === retrieved
    });
  } catch (error) {
    json(res, 500, {
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
};
