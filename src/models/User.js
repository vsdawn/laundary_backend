const mongoose = require("mongoose");
const { ROLES } = require("../constants/roles");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, index: true },
    email: { type: String, lowercase: true },
    role: {
      type: String,
      enum: [ROLES.ADMIN, ROLES.DRIVER, ROLES.FACILITY_STAFF],
      required: true,
      index: true,
    },
    // Driver-specific
    vehicleNumber: String,
    isOnline: { type: Boolean, default: false },
    currentLocation: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },
    fcmTokens: [String],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.index({ currentLocation: "2dsphere" });

module.exports = mongoose.model("User", userSchema);
