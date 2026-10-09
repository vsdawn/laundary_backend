const mongoose = require("mongoose");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const OrderStatusHistory = require("../models/OrderStatusHistory");
const PickupDelivery = require("../models/PickupDelivery");
const Payment = require("../models/Payment");
const Address = require("../models/Address");
const Coupon = require("../models/Coupon");
const ApiError = require("../utils/ApiError");
const generateOrderNumber = require("../utils/generateOrderNumber");
const pricing = require("./pricing.service");
const { updateOrderStatus } = require("./orderStatus.service");
const { ORDER_STATUS, CANCELLATION_RULES, ACTIVE_STATUSES } = require("../constants/orderStatus");
const { ROLES } = require("../constants/roles");

const snapshotAddress = (a) => ({
  name: a.name, phone: a.phone,
  addressLine1: a.addressLine1, addressLine2: a.addressLine2, landmark: a.landmark,
  city: a.city, state: a.state, pincode: a.pincode,
  coordinates: a.location?.coordinates,
});

// ---------- Create ----------
exports.createOrder = async (customerId, payload) => {
  const { pickupAddressId, deliveryAddressId, pickupSlot, items, paymentMethod, couponCode, notes } = payload;

  const [pickupAddr, deliveryAddr] = await Promise.all([
    Address.findOne({ _id: pickupAddressId, customerId, isDeleted: false }),
    Address.findOne({ _id: deliveryAddressId, customerId, isDeleted: false }),
  ]);
  if (!pickupAddr || !deliveryAddr) throw ApiError.badRequest("Invalid address");

  const pricedItems = await pricing.priceItems(items);
  const subtotal = pricing.round2(pricedItems.reduce((s, i) => s + i.totalPrice, 0));
  const { discount, coupon } = await pricing.applyCoupon(couponCode, subtotal);
  const totals = pricing.computeTotals({ subtotal, discount });

  const session = await mongoose.startSession();
  let order;
  try {
    await session.withTransaction(async () => {
      const orderNumber = await generateOrderNumber(session);

      [order] = await Order.create(
        [{
          orderNumber,
          customerId,
          pickupAddressId,
          deliveryAddressId,
          pickupAddress: snapshotAddress(pickupAddr),
          deliveryAddress: snapshotAddress(deliveryAddr),
          pickupSlot,
          paymentMethod,
          couponCode: coupon?.code,
          notes,
          pricing: { estimatedSubtotal: subtotal, ...totals },
        }],
        { session }
      );

      await OrderItem.insertMany(pricedItems.map((i) => ({ ...i, orderId: order._id })), { session });

      await OrderStatusHistory.create(
        [{
          orderId: order._id,
          toStatus: ORDER_STATUS.BOOKED,
          updatedBy: customerId,
          updatedByModel: "Customer",
          role: ROLES.CUSTOMER,
        }],
        { session }
      );

      if (coupon) {
        await Coupon.updateOne({ _id: coupon._id }, { $inc: { usedCount: 1 } }, { session });
      }
    });
  } finally {
    session.endSession();
  }

  return order;
};

// ---------- Read ----------
exports.listCustomerOrders = async (customerId, { page = 1, limit = 10, status }) => {
  const filter = { customerId };
  if (status === "ACTIVE") filter.status = { $in: ACTIVE_STATUSES };
  else if (status) filter.status = status;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("orderNumber status pricing.total pickupSlot createdAt")
      .lean(),
    Order.countDocuments(filter),
  ]);

  return { orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

exports.getOrderDetail = async (orderId, { customerId } = {}) => {
  const filter = { _id: orderId };
  if (customerId) filter.customerId = customerId; // customers can only see their own orders

  const order = await Order.findOne(filter).lean();
  if (!order) throw ApiError.notFound("Order not found");

  const [items, statusHistory, legs, payment] = await Promise.all([
    OrderItem.find({ orderId }).lean(),
    OrderStatusHistory.find({ orderId }).sort({ createdAt: 1 }).lean(),
    PickupDelivery.find({ orderId }).populate("driverId", "name phone vehicleNumber").lean(),
    Payment.findOne({ orderId }).sort({ createdAt: -1 }).lean(),
  ]);

  return {
    order,
    items,
    statusHistory,
    pickup: legs.find((l) => l.type === "PICKUP") || null,
    delivery: legs.find((l) => l.type === "DELIVERY") || null,
    payment,
  };
};

// ---------- Cancel ----------
exports.cancelByCustomer = async (orderId, customerId, reason) => {
  const order = await Order.findOne({ _id: orderId, customerId });
  if (!order) throw ApiError.notFound("Order not found");

  const rule = CANCELLATION_RULES[order.status];
  if (!rule?.allowed) throw ApiError.badRequest(`Order cannot be cancelled in ${order.status} stage`);

  return updateOrderStatus({
    orderId,
    newStatus: ORDER_STATUS.CANCELLED,
    userId: customerId,
    role: ROLES.CUSTOMER,
    note: reason,
    mutate: async (o, session) => {
      o.cancellation = {
        reason,
        cancelledBy: customerId,
        cancelledByModel: "Customer",
        cancelledAt: new Date(),
      };
      o.pricing.cancellationFee = rule.fee;
      // free up any assigned pickup leg
      await PickupDelivery.updateMany(
        { orderId, status: { $in: ["ASSIGNED", "ACCEPTED"] } },
        { status: "FAILED", failureReason: "Order cancelled" },
        { session }
      );
    },
  });
};

// ---------- Inspection: final pricing ----------
/**
 * items: [{ orderItemId?, serviceId, itemId?, quantity?, weight?, damageNotes? }]
 * Replaces line items with the actual counted items and recomputes totals.
 */
exports.finalizeInspection = async (orderId, items, staffId) => {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound("Order not found");
  if (order.status !== ORDER_STATUS.INSPECTION) throw ApiError.badRequest("Order is not in INSPECTION");

  const priced = await pricing.priceItems(items);
  const finalSubtotal = pricing.round2(priced.reduce((s, i) => s + i.totalPrice, 0));

  let discount = 0;
  if (order.couponCode) {
    ({ discount } = await pricing.applyCoupon(order.couponCode, finalSubtotal).catch(() => ({ discount: 0 })));
  }
  const totals = pricing.computeTotals({
    subtotal: finalSubtotal,
    discount,
    pickupFee: order.pricing.pickupFee,
    deliveryFee: order.pricing.deliveryFee,
  });

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await OrderItem.deleteMany({ orderId }, { session });
      await OrderItem.insertMany(
        priced.map((p, idx) => ({
          ...p,
          orderId,
          estimatedQuantity: 0,
          damageNotes: items[idx].damageNotes,
        })),
        { session }
      );
      order.pricing = { ...order.pricing.toObject(), finalSubtotal, ...totals };
      await order.save({ session });
    });
  } finally {
    session.endSession();
  }

  return order;
};
