const mongoose = require("mongoose");

const serviceItemSchema = new mongoose.Schema(
  {
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true, index: true },
    name: { type: String, required: true }, // "Shirt"
    code: String,                           // "SHIRT"
    price: { type: Number, required: true, min: 0 },
    image: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

serviceItemSchema.index({ serviceId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model("ServiceItem", serviceItemSchema);
