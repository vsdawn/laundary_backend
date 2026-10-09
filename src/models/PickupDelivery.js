const mongoose = require("mongoose");

const pickupDeliverySchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    type: { type: String, enum: ["PICKUP", "DELIVERY"], required: true },
    status: {
      type: String,
      enum: ["ASSIGNED", "ACCEPTED", "ARRIVED", "COMPLETED", "FAILED"],
      default: "ASSIGNED",
    },
    otpHash: { type: String, select: false }, // never return OTP hash in responses
    otpAttempts: { type: Number, default: 0 },
    assignedAt: Date,
    acceptedAt: Date,
    arrivedAt: Date,
    completedAt: Date,
    failureReason: String,
    proofImages: [String],
    notes: String,
  },
  { timestamps: true }
);

pickupDeliverySchema.index({ driverId: 1, status: 1 });

module.exports = mongoose.model("PickupDelivery", pickupDeliverySchema);
