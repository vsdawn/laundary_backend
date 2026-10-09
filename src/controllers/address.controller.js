const asyncHandler = require("../utils/asyncHandler");
const Address = require("../models/Address");
const ApiError = require("../utils/ApiError");

const unsetOtherDefaults = (customerId, exceptId) =>
  Address.updateMany({ customerId, _id: { $ne: exceptId } }, { isDefault: false });

exports.create = asyncHandler(async (req, res) => {
  const { lat, lng, ...rest } = req.body;
  const address = await Address.create({
    ...rest,
    customerId: req.user.id,
    ...(lat != null && lng != null && { location: { type: "Point", coordinates: [lng, lat] } }),
  });
  if (address.isDefault) await unsetOtherDefaults(req.user.id, address._id);
  res.status(201).json({ success: true, data: address });
});

exports.list = asyncHandler(async (req, res) => {
  const list = await Address.find({ customerId: req.user.id, isDeleted: false })
    .sort({ isDefault: -1, updatedAt: -1 })
    .lean();
  res.json({ success: true, data: list });
});

exports.get = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ _id: req.params.id, customerId: req.user.id, isDeleted: false });
  if (!address) throw ApiError.notFound("Address not found");
  res.json({ success: true, data: address });
});

exports.update = asyncHandler(async (req, res) => {
  const { lat, lng, ...rest } = req.body;
  const update = { ...rest };
  if (lat != null && lng != null) update.location = { type: "Point", coordinates: [lng, lat] };

  const address = await Address.findOneAndUpdate(
    { _id: req.params.id, customerId: req.user.id, isDeleted: false },
    update,
    { new: true }
  );
  if (!address) throw ApiError.notFound("Address not found");
  if (address.isDefault) await unsetOtherDefaults(req.user.id, address._id);
  res.json({ success: true, data: address });
});

exports.remove = asyncHandler(async (req, res) => {
  const result = await Address.updateOne(
    { _id: req.params.id, customerId: req.user.id },
    { isDeleted: true, isDefault: false }
  );
  if (!result.matchedCount) throw ApiError.notFound("Address not found");
  res.json({ success: true });
});
