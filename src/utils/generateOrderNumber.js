const Counter = require("../models/Counter");

module.exports = async (session) => {
  const counter = await Counter.findOneAndUpdate(
    { _id: "orderNumber" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session }
  );
  return `LND${String(1000 + counter.seq)}`; // LND1001, LND1002 ...
};
