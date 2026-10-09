const asyncHandler = require("../utils/asyncHandler");
const Service = require("../models/Service");
const ServiceItem = require("../models/ServiceItem");
const ApiError = require("../utils/ApiError");

exports.list = asyncHandler(async (req, res) => {
  const services = await Service.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
  res.json({ success: true, data: services });
});

exports.get = asyncHandler(async (req, res) => {
  const service = await Service.findOne({ _id: req.params.id, isActive: true }).lean();
  if (!service) throw ApiError.notFound("Service not found");
  res.json({ success: true, data: service });
});

exports.items = asyncHandler(async (req, res) => {
  const items = await ServiceItem.find({ serviceId: req.params.id, isActive: true }).sort({ name: 1 }).lean();
  res.json({ success: true, data: items });
});
