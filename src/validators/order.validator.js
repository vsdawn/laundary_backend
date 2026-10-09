const Joi = require("joi");
const { ORDER_STATUS } = require("../constants/orderStatus");

const objectId = Joi.string().hex().length(24);
const time = Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/);

const line = Joi.object({
  serviceId: objectId.required(),
  itemId: objectId,
  quantity: Joi.number().integer().min(1).max(500),
  weight: Joi.number().min(0.1).max(100),
  damageNotes: Joi.string().max(500),
});

exports.createOrder = Joi.object({
  pickupAddressId: objectId.required(),
  deliveryAddressId: objectId.required(),
  pickupSlot: Joi.object({
    date: Joi.date().min("now").required(),
    startTime: time.required(),
    endTime: time.required(),
  }).required(),
  items: Joi.array().items(line).min(1).required(),
  paymentMethod: Joi.string().valid("COD", "UPI", "CARD", "WALLET").required(),
  couponCode: Joi.string().trim(),
  notes: Joi.string().max(500),
});

exports.cancelOrder = Joi.object({ reason: Joi.string().max(300).required() });

exports.updateStatus = Joi.object({
  status: Joi.string().valid(...Object.values(ORDER_STATUS)).required(),
  note: Joi.string().max(300),
});

exports.assignDriver = Joi.object({
  driverId: objectId.required(),
  type: Joi.string().valid("PICKUP", "DELIVERY").required(),
});

exports.inspection = Joi.object({ items: Joi.array().items(line).min(1).required() });

exports.completeTask = Joi.object({ otp: Joi.string().length(4).required() });

exports.location = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
});
