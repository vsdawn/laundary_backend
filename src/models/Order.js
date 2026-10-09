const mongoose = require("mongoose");
const { ORDER_STATUS } = require("../constants/orderStatus");

const slotSchema = new mongoose.Schema(
  { date: Date, startTime: String, endTime: String },
  { _id: false }
);

// Snapshot of the address at booking time — edits to the address later don't change old orders
const addressSnapshotSchema = new mongoose.Schema(
  {
    name: String, phone: String,
    addressLine1: String, addressLine2: String, landmark: String,
    city: String, state: String, pincode: String,
    coordinates: [Number],
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },

    pickupAddressId: { type: mongoose.Schema.Types.ObjectId, ref: "Address", required: true },
    deliveryAddressId: { type: mongoose.Schema.Types.ObjectId, ref: "Address", required: true },
    pickupAddress: addressSnapshotSchema,
    deliveryAddress: addressSnapshotSchema,

    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.BOOKED,
      index: true,
    },

    pickupSlot: slotSchema,
    deliverySlot: slotSchema,

    facilityId: { type: mongoose.Schema.Types.ObjectId, ref: "LaundryFacility" },
    pickupDriverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    deliveryDriverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },

    pricing: {
      estimatedSubtotal: { type: Number, default: 0 },
      finalSubtotal: Number,
      discount: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      pickupFee: { type: Number, default: 0 },
      deliveryFee: { type: Number, default: 0 },
      cancellationFee: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },

    couponCode: String,

    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED", "REFUNDED", "PARTIAL_REFUND"],
      default: "PENDING",
    },
    paymentMethod: { type: String, enum: ["COD", "UPI", "CARD", "WALLET"] },

    cancellation: {
      reason: String,
      cancelledBy: { type: mongoose.Schema.Types.ObjectId, refPath: "cancellation.cancelledByModel" },
      cancelledByModel: { type: String, enum: ["Customer", "User"] },
      cancelledAt: Date,
    },

    notes: String,
  },
  { timestamps: true }
);

orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);
