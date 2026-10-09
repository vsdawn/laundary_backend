const Service = require("../models/Service");
const ServiceItem = require("../models/ServiceItem");
const Coupon = require("../models/Coupon");
const ApiError = require("../utils/ApiError");
const { taxPercent } = require("../config/env");

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * items: [{ serviceId, itemId?, quantity?, weight? }]
 * returns priced line items with snapshots
 */
exports.priceItems = async (items) => {
  const serviceIds = [...new Set(items.map((i) => String(i.serviceId)))];
  const itemIds = items.filter((i) => i.itemId).map((i) => i.itemId);

  const [services, serviceItems] = await Promise.all([
    Service.find({ _id: { $in: serviceIds }, isActive: true }).lean(),
    ServiceItem.find({ _id: { $in: itemIds }, isActive: true }).lean(),
  ]);

  const serviceMap = new Map(services.map((s) => [String(s._id), s]));
  const itemMap = new Map(serviceItems.map((i) => [String(i._id), i]));

  return items.map((line) => {
    const service = serviceMap.get(String(line.serviceId));
    if (!service) throw ApiError.badRequest(`Invalid service ${line.serviceId}`);

    if (service.pricingType === "PER_KG") {
      const weight = line.weight || 1;
      return {
        serviceId: service._id,
        serviceName: service.name,
        pricingType: "PER_KG",
        weight,
        quantity: 1,
        estimatedQuantity: 1,
        unitPrice: service.basePrice,
        totalPrice: round2(service.basePrice * weight),
      };
    }

    const item = itemMap.get(String(line.itemId));
    if (!item || String(item.serviceId) !== String(service._id)) {
      throw ApiError.badRequest(`Invalid item ${line.itemId} for service ${service.name}`);
    }
    const quantity = line.quantity || 1;
    return {
      serviceId: service._id,
      itemId: item._id,
      serviceName: service.name,
      itemName: item.name,
      pricingType: "PER_ITEM",
      quantity,
      estimatedQuantity: quantity,
      unitPrice: item.price,
      totalPrice: round2(item.price * quantity),
    };
  });
};

exports.applyCoupon = async (code, subtotal) => {
  if (!code) return { discount: 0 };
  const now = new Date();
  const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });

  if (
    !coupon ||
    (coupon.validFrom && coupon.validFrom > now) ||
    (coupon.validTill && coupon.validTill < now) ||
    (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit)
  ) {
    throw ApiError.badRequest("Invalid or expired coupon");
  }
  if (subtotal < coupon.minOrderValue) {
    throw ApiError.badRequest(`Minimum order value ₹${coupon.minOrderValue}`);
  }

  let discount = coupon.type === "FLAT" ? coupon.value : (subtotal * coupon.value) / 100;
  if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  return { discount: round2(Math.min(discount, subtotal)), coupon };
};

exports.computeTotals = ({ subtotal, discount = 0, pickupFee = 0, deliveryFee = 0 }) => {
  const taxable = Math.max(subtotal - discount, 0);
  const tax = round2((taxable * taxPercent) / 100);
  return {
    discount,
    tax,
    pickupFee,
    deliveryFee,
    total: round2(taxable + tax + pickupFee + deliveryFee),
  };
};

exports.round2 = round2;
