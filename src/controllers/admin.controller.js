const asyncHandler = require("../utils/asyncHandler");
const Order = require("../models/Order");
const orderService = require("../services/order.service");
const driverService = require("../services/driver.service");
const { updateOrderStatus } = require("../services/orderStatus.service");

exports.listOrders = asyncHandler(async (req, res) => {
  const { status, customerId, driverId, paymentStatus, orderNumber, from, to } = req.query;
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const filter = {};
  if (status) filter.status = status;
  if (customerId) filter.customerId = customerId;
  if (driverId) filter.$or = [{ pickupDriverId: driverId }, { deliveryDriverId: driverId }];
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (orderNumber) filter.orderNumber = orderNumber.toUpperCase();
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("customerId", "name phone")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
  ]);

  res.json({ success: true, data: { orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
});

exports.orderDetail = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await orderService.getOrderDetail(req.params.id) });
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const order = await updateOrderStatus({
    orderId: req.params.id,
    newStatus: req.body.status,
    userId: req.user.id,
    role: req.user.role,
    note: req.body.note,
  });
  res.json({ success: true, data: order });
});

exports.assignDriver = asyncHandler(async (req, res) => {
  const leg = await driverService.assignDriver({
    orderId: req.params.id,
    driverId: req.body.driverId,
    type: req.body.type, // "PICKUP" | "DELIVERY"
    adminId: req.user.id,
  });
  res.json({ success: true, data: leg });
});

exports.assignFacility = asyncHandler(async (req, res) => {
  const order = await Order.findByIdAndUpdate(req.params.id, { facilityId: req.body.facilityId }, { new: true });
  res.json({ success: true, data: order });
});

exports.finalizeInspection = asyncHandler(async (req, res) => {
  const order = await orderService.finalizeInspection(req.params.id, req.body.items, req.user.id);
  res.json({ success: true, data: order });
});
