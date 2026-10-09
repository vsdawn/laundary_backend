const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    amount: { type: Number, required: true },
    method: { type: String, enum: ["COD", "UPI", "CARD", "WALLET"], required: true },
    status: { type: String, enum: ["INITIATED", "SUCCESS", "FAILED", "REFUNDED"], default: "INITIATED" },
    gateway: String,           // "RAZORPAY", "CASHFREE" ...
    gatewayOrderId: String,
    gatewayPaymentId: String,
    refundAmount: { type: Number, default: 0 },
    meta: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
