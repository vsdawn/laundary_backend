const asyncHandler = require("../utils/asyncHandler");
const authService = require("../services/auth.service");

exports.sendOtp = asyncHandler(async (req, res) => {
  await authService.sendOtp(req.body.phone);
  res.json({ success: true, message: "OTP sent" });
});

exports.verifyOtp = asyncHandler(async (req, res) => {
  const result = await authService.verifyOtp(req.body);
  res.json({ success: true, data: result });
});

exports.refreshToken = asyncHandler(async (req, res) => {
  res.json({ success: true, data: authService.refresh(req.body.refreshToken) });
});

exports.logout = asyncHandler(async (req, res) => {
  // TODO: revoke stored refresh token + remove FCM token
  res.json({ success: true });
});
