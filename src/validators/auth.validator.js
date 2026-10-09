const Joi = require("joi");

const phone = Joi.string().pattern(/^[6-9]\d{9}$/).required(); // Indian mobile

exports.sendOtp = Joi.object({ phone });
exports.verifyOtp = Joi.object({
  phone,
  otp: Joi.string().length(6).required(),
  app: Joi.string().valid("customer", "staff").default("customer"),
});
exports.refresh = Joi.object({ refreshToken: Joi.string().required() });
