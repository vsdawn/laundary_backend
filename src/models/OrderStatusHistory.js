const mongoose = require("mongoose");

const orderStatusHistorySchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    fromStatus: String,
    toStatus: { type: String, required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, refPath: "updatedByModel" },
    updatedByModel: { type: String, enum: ["Customer", "User"] },
    role: String,
    note: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("OrderStatusHistory", orderStatusHistorySchema);
