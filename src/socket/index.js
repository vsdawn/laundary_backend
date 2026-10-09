const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Order = require("../models/Order");
const { jwt: jwtConfig } = require("../config/env");
const { ROLES } = require("../constants/roles");

let io;

exports.initSocket = (server) => {
  io = new Server(server, { cors: { origin: "*" } });

  // Authenticate every socket connection with the access token
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const payload = jwt.verify(token, jwtConfig.accessSecret);
      socket.user = { id: payload.sub, role: payload.role };
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const { id, role } = socket.user;
    socket.join(`${role.toLowerCase()}:${id}`); // personal room
    if (role === ROLES.ADMIN || role === ROLES.FACILITY_STAFF) socket.join("admins");

    socket.on("order:join", async ({ orderId }, ack) => {
      // Customers may only join rooms for their own orders
      if (role === ROLES.CUSTOMER) {
        const owns = await Order.exists({ _id: orderId, customerId: id });
        if (!owns) return ack?.({ ok: false, error: "Forbidden" });
      }
      socket.join(`order:${orderId}`);
      ack?.({ ok: true });
    });

    socket.on("order:leave", ({ orderId }) => socket.leave(`order:${orderId}`));

    // Driver live location → customer tracking screen
    socket.on("driver:location", ({ orderId, lat, lng }) => {
      if (role !== ROLES.DRIVER) return;
      io.to(`order:${orderId}`).emit("DRIVER_LOCATION", { orderId, lat, lng, at: Date.now() });
    });
  });

  return io;
};

exports.emitOrderUpdate = (order) => {
  if (!io) return;
  const payload = { orderId: String(order._id), orderNumber: order.orderNumber, status: order.status };
  io.to(`order:${order._id}`).emit("ORDER_STATUS_UPDATED", payload);
  io.to(`customer:${order.customerId}`).emit("ORDER_STATUS_UPDATED", payload);
  io.to("admins").emit("ORDER_STATUS_UPDATED", payload);
};

exports.getIO = () => io;
