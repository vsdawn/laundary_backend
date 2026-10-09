const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: "ServiceItem" }, // null for PER_KG

    // Snapshots — prices can change later; the order keeps what was charged
    serviceName: String,
    itemName: String,
    pricingType: { type: String, enum: ["PER_ITEM", "PER_KG"] },

    estimatedQuantity: { type: Number, default: 1 },
    quantity: { type: Number, default: 1 }, // actual, set at inspection
    weight: Number,                          // kg, for PER_KG
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },

    status: {
      type: String,
      enum: ["RECEIVED", "WASHING", "DRYING", "IRONING", "READY"],
      default: "RECEIVED",
    },
    damageNotes: String,
    images: [String],
    notes: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("OrderItem", orderItemSchema);
