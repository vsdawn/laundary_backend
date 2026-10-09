const mongoose = require("mongoose");
const Order = require("../models/Order");
const OrderStatusHistory = require("../models/OrderStatusHistory");
const ApiError = require("../utils/ApiError");
const { TRANSITIONS } = require("../constants/orderStatus");
const { ROLES } = require("../constants/roles");
const { emitOrderUpdate } = require("../socket");
const notificationService = require("./notification.service");

const validateTransition = (from, to, role) => {
  const allowed = TRANSITIONS[from]?.[to];
  if (!allowed) throw ApiError.badRequest(`Cannot move order from ${from} to ${to}`);
  if (role !== ROLES.ADMIN && !allowed.includes(role)) {
    throw ApiError.forbidden(`${role} cannot move order from ${from} to ${to}`);
  }
};

/**
 * Updates status + writes history atomically, then fires side-effects.
 * `mutate(order, session)` lets callers change extra fields in the same transaction.
 */
exports.updateOrderStatus = async ({ orderId, newStatus, userId, role, note, mutate, session: outerSession }) => {
  const session = outerSession || (await mongoose.startSession());
  let order;

  try {
    const run = async () => {
      order = await Order.findById(orderId).session(session);
      if (!order) throw ApiError.notFound("Order not found");

      validateTransition(order.status, newStatus, role);
      const fromStatus = order.status;

      order.status = newStatus;
      if (mutate) await mutate(order, session);
      await order.save({ session });

      await OrderStatusHistory.create(
        [{
          orderId,
          fromStatus,
          toStatus: newStatus,
          updatedBy: userId,
          updatedByModel: role === ROLES.CUSTOMER ? "Customer" : "User",
          role,
          note,
        }],
        { session }
      );
    };

    if (outerSession) await run();
    else await session.withTransaction(run);
  } finally {
    if (!outerSession) session.endSession();
  }

  // Side-effects after commit — failures here must not roll back the status change
  emitOrderUpdate(order);
  notificationService.notifyOrderStatus(order).catch((e) => console.error("Notify failed", e));

  return order;
};

exports.validateTransition = validateTransition;
