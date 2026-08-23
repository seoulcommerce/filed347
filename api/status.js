const { AMOUNT, CURRENCY, INTERVAL, liveKeys, json } = require("../lib-stripe");

module.exports = async function handler(req, res) {
  const { live } = liveKeys();
  json(res, 200, {
    product: "filed347",
    live,
    amount: AMOUNT,
    currency: CURRENCY,
    interval: INTERVAL
  });
};
