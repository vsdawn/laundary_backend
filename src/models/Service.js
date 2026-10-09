const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },            // "Wash & Iron"
    code: { type: String, required: true, unique: true }, // "WASH_IRON"
    description: String,
    icon: String,
    pricingType: { type: String, enum: ["PER_ITEM", "PER_KG"], default: "PER_ITEM" },
    basePrice: { type: Number, required: true, min: 0 }, // used for PER_KG
    turnaroundHours: { type: Number, default: 48 },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Service", serviceSchema);
