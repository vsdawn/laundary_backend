const mongoose = require("mongoose");
const Order = require("../models/Order");
const PickupDelivery = require("../models/PickupDelivery");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const { updateOrderStatus } = require("./orderStatus.service");
const { ORDER_STATUS } = require("../constants/orderStatus");
const { ROLES } = require("../constants/roles");
const { generateOtp, hashOtp, compareOtp } = require("../utils/otp");
const notificationService = require("./notification.service");

const MAX_OTP_ATTEMPTS = 5;

// ---------- Admin: assign ----------
exports.assignDriver = async ({ orderId, driverId, type, adminId }) => {
  const driver = await User.findOne({ _id: driverId, role: ROLES.DRIVER, isActive: true });
  if (!driver) throw ApiError.badRequest("Invalid driver");

  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound("Order not found");

  if (type === "PICKUP" && order.status !== ORDER_STATUS.BOOKED) {
    throw ApiError.badRequest("Pickup can only be assigned to BOOKED orders");
  }
  if (type === "DELIVERY" && order.status !== ORDER_STATUS.READY_FOR_DELIVERY) {
    throw ApiError.badRequest("Delivery can only be assigned to READY_FOR_DELIVERY orders");
  }

  const otp = generateOtp(4);
  const otpHash = await hashOtp(otp);

  const leg = await PickupDelivery.findOneAndUpdate(
    { orderId, type, status: { $ne: "COMPLETED" } },
    { driverId, status: "ASSIGNED", assignedAt: new Date(), otpHash, otpAttempts: 0 },
    { upsert: true, new: true }
  );

  if (type === "PICKUP") {
    await updateOrderStatus({
      orderId,
      newStatus: ORDER_STATUS.PICKUP_ASSIGNED,
      userId: adminId,
      role: ROLES.SYSTEM,
      note: `Pickup assigned to ${driver.name}`,
      mutate: (o) => { o.pickupDriverId = driverId; },
    });
  } else {
    await Order.updateOne({ _id: orderId }, { deliveryDriverId: driverId });
  }

  // Customer shares this OTP with the driver at the door
  await notificationService.sendToCustomer(order.customerId, {
    title: `${type === "PICKUP" ? "Pickup" : "Delivery"} OTP`,
    body: `Your OTP for order ${order.orderNumber} is ${otp}`,
    data: { orderId: String(orderId), type: "OTP" },
  });

  return leg;
};

// ---------- Driver actions ----------
const getLeg = async (legId, driverId, withOtp = false) => {
  const q = PickupDelivery.findOne({ _id: legId, driverId });
  if (withOtp) q.select("+otpHash");
  const leg = await q;
  if (!leg) throw ApiError.notFound("Task not found");
  return leg;
};

exports.listTasks = (driverId, { status } = {}) => {
  const filter = { driverId };
  filter.status = status ? status : { $in: ["ASSIGNED", "ACCEPTED", "ARRIVED"] };
  return PickupDelivery.find(filter)
    .populate("orderId", "orderNumber status pickupAddress deliveryAddress pickupSlot deliverySlot pricing.total paymentMethod")
    .sort({ assignedAt: 1 })
    .lean();
};

exports.getTask = async (legId, driverId) => {
  const leg = await PickupDelivery.findOne({ _id: legId, driverId })
    .populate("orderId")
    .lean();
  if (!leg) throw ApiError.notFound("Task not found");
  return leg;
};

exports.accept = async (legId, driverId) => {
  const leg = await getLeg(legId, driverId);
  if (leg.status !== "ASSIGNED") throw ApiError.badRequest("Task is not in ASSIGNED state");
  leg.status = "ACCEPTED";
  leg.acceptedAt = new Date();
  await leg.save();

  if (leg.type === "DELIVERY") {
    await updateOrderStatus({
      orderId: leg.orderId,
      newStatus: ORDER_STATUS.OUT_FOR_DELIVERY,
      userId: driverId,
      role: ROLES.DRIVER,
    });
  }
  return leg;
};

exports.arrived = async (legId, driverId) => {
  const leg = await getLeg(legId, driverId);
  if (leg.status !== "ACCEPTED") throw ApiError.badRequest("Accept the task first");
  leg.status = "ARRIVED";
  leg.arrivedAt = new Date();
  await leg.save();
  return leg;
};

exports.complete = async (legId, driverId, otp) => {
  const leg = await getLeg(legId, driverId, true);
  if (leg.status !== "ARRIVED") throw ApiError.badRequest("Mark arrived first");
  if (leg.otpAttempts >= MAX_OTP_ATTEMPTS) throw ApiError.badRequest("OTP attempts exceeded. Contact support.");

  const ok = await compareOtp(String(otp), leg.otpHash);
  if (!ok) {
    leg.otpAttempts += 1;
    await leg.save();
    throw ApiError.badRequest("Invalid OTP");
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      leg.status = "COMPLETED";
      leg.completedAt = new Date();
      leg.otpHash = undefined;
      await leg.save({ session });

      await updateOrderStatus({
        orderId: leg.orderId,
        newStatus: leg.type === "PICKUP" ? ORDER_STATUS.PICKED_UP : ORDER_STATUS.DELIVERED,
        userId: driverId,
        role: ROLES.DRIVER,
        session,
      });
    });
  } finally {
    session.endSession();
  }
  return leg;
};

exports.updateLocation = (driverId, { lat, lng }) =>
  User.updateOne(
    { _id: driverId },
    { currentLocation: { type: "Point", coordinates: [lng, lat] } }
  );

exports.findNearestDrivers = (lng, lat, maxMeters = 5000) =>
  User.find({
    role: ROLES.DRIVER,
    isActive: true,
    isOnline: true,
    currentLocation: {
      $near: { $geometry: { type: "Point", coordinates: [lng, lat] }, $maxDistance: maxMeters },
    },
  }).limit(10);
