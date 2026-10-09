const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    label: { type: String, enum: ["HOME", "OFFICE", "OTHER"], default: "HOME" },
    name: String,
    phone: String,
    addressLine1: { type: String, required: true },
    addressLine2: String,
    landmark: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },
    isDefault: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false }, // soft delete: old orders still reference it
  },
  { timestamps: true }
);

addressSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Address", addressSchema);
