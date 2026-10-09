const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    type: { type: String, enum: ["FLAT", "PERCENT"], required: true },
    value: { type: Number, required: true },
    maxDiscount: Number,
    minOrderValue: { type: Number, default: 0 },
    validFrom: Date,
    validTill: Date,
    usageLimit: Number,
    usedCount: { type: Number, default: 0 },
    perCustomerLimit: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Coupon", couponSchema);
