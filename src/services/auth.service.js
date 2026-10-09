const jwt = require("jsonwebtoken");
const Otp = require("../models/Otp");
const Customer = require("../models/Customer");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const { generateOtp, hashOtp, compareOtp } = require("../utils/otp");
const { jwt: jwtConfig, otpExpiryMinutes, nodeEnv } = require("../config/env");
const { ROLES } = require("../constants/roles");

const MAX_ATTEMPTS = 5;

const signTokens = (id, role) => ({
  accessToken: jwt.sign({ sub: id, role }, jwtConfig.accessSecret, { expiresIn: jwtConfig.accessExpires }),
  refreshToken: jwt.sign({ sub: id, role }, jwtConfig.refreshSecret, { expiresIn: jwtConfig.refreshExpires }),
});

exports.sendOtp = async (phone) => {
  const otp = generateOtp(6);
  await Otp.deleteMany({ phone });
  await Otp.create({
    phone,
    otpHash: await hashOtp(otp),
    expiresAt: new Date(Date.now() + otpExpiryMinutes * 60 * 1000),
  });

  // TODO: send via SMS provider (MSG91 / Twilio / Fast2SMS)
  if (nodeEnv !== "production") console.log(`OTP for ${phone}: ${otp}`);
};

/**
 * app = "customer" | "staff"
 * Customer app auto-registers new phones; staff must already exist.
 */
exports.verifyOtp = async ({ phone, otp, app = "customer" }) => {
  const record = await Otp.findOne({ phone });
  if (!record || record.expiresAt < new Date()) throw ApiError.badRequest("OTP expired");
  if (record.attempts >= MAX_ATTEMPTS) throw ApiError.badRequest("Too many attempts");

  const ok = await compareOtp(otp, record.otpHash);
  if (!ok) {
    record.attempts += 1;
    await record.save();
    throw ApiError.badRequest("Invalid OTP");
  }
  await record.deleteOne();

  if (app === "staff") {
    const user = await User.findOne({ phone, isActive: true });
    if (!user) throw ApiError.forbidden("Not a registered staff member");
    return { user, isNewUser: false, ...signTokens(user.id, user.role) };
  }

  let customer = await Customer.findOne({ phone });
  const isNewUser = !customer;
  if (!customer) customer = await Customer.create({ phone });
  if (!customer.isActive) throw ApiError.forbidden("Account disabled");

  return { user: customer, isNewUser, ...signTokens(customer.id, ROLES.CUSTOMER) };
};

exports.refresh = (refreshToken) => {
  try {
    const payload = jwt.verify(refreshToken, jwtConfig.refreshSecret);
    return signTokens(payload.sub, payload.role);
  } catch {
    throw ApiError.unauthorized("Invalid refresh token");
  }
};
