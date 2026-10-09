const asyncHandler = require("../utils/asyncHandler");
const orderService = require("../services/order.service");

exports.create = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder(req.user.id, req.body);
  res.status(201).json({ success: true, data: order });
});

exports.list = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const data = await orderService.listCustomerOrders(req.user.id, { page, limit, status: req.query.status });
  res.json({ success: true, data });
});

exports.detail = asyncHandler(async (req, res) => {
  const data = await orderService.getOrderDetail(req.params.orderId, { customerId: req.user.id });
  res.json({ success: true, data });
});

exports.cancel = asyncHandler(async (req, res) => {
  const order = await orderService.cancelByCustomer(req.params.orderId, req.user.id, req.body.reason);
  res.json({ success: true, data: order });
});
