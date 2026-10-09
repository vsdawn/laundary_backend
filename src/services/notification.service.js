const admin = require("../config/firebase");
const Customer = require("../models/Customer");
const Notification = require("../models/Notification");

const STATUS_MESSAGES = {
  PICKUP_ASSIGNED: "A pickup partner has been assigned to your order.",
  PICKED_UP: "Your clothes have been picked up.",
  RECEIVED_AT_FACILITY: "Your order has reached our facility.",
  INSPECTION: "Your items are being inspected.",
  WASHING: "Your clothes are being washed.",
  DRYING: "Your clothes are drying.",
  IRONING: "Your clothes are being ironed.",
  QUALITY_CHECK: "Your order is in quality check.",
  READY_FOR_DELIVERY: "Your order is ready for delivery.",
  OUT_FOR_DELIVERY: "Your order is out for delivery.",
  DELIVERED: "Your order has been delivered. Thank you!",
  CANCELLED: "Your order has been cancelled.",
};

const sendToCustomer = async (customerId, { title, body, data = {} }) => {
  await Notification.create({ recipientId: customerId, recipientModel: "Customer", title, body, data });

  const customer = await Customer.findById(customerId).select("fcmTokens").lean();
  const tokens = customer?.fcmTokens || [];
  if (!tokens.length || !admin.isReady()) return;

  const res = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
  });

  // Remove dead tokens
  const invalid = res.responses
    .map((r, i) => (!r.success && r.error?.code === "messaging/registration-token-not-registered" ? tokens[i] : null))
    .filter(Boolean);
  if (invalid.length) await Customer.updateOne({ _id: customerId }, { $pull: { fcmTokens: { $in: invalid } } });
};

exports.sendToCustomer = sendToCustomer;

exports.notifyOrderStatus = async (order) => {
  const body = STATUS_MESSAGES[order.status];
  if (!body) return;
  await sendToCustomer(order.customerId, {
    title: `Order ${order.orderNumber}`,
    body,
    data: { orderId: String(order._id), status: order.status, type: "ORDER_STATUS" },
  });
};
