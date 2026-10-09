const asyncHandler = require("../utils/asyncHandler");
const Customer = require("../models/Customer");

exports.getMe = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.user.id).lean();
  res.json({ success: true, data: customer });
});

exports.updateMe = asyncHandler(async (req, res) => {
  const { name, email, profileImage } = req.body;
  const customer = await Customer.findByIdAndUpdate(
    req.user.id,
    { name, email, profileImage },
    { new: true, runValidators: true, omitUndefined: true }
  );
  res.json({ success: true, data: customer });
});

exports.registerFcmToken = asyncHandler(async (req, res) => {
  await Customer.updateOne({ _id: req.user.id }, { $addToSet: { fcmTokens: req.body.token } });
  res.json({ success: true });
});
