const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipientId: { type: mongoose.Schema.Types.ObjectId, refPath: "recipientModel", required: true, index: true },
    recipientModel: { type: String, enum: ["Customer", "User"], required: true },
    title: String,
    body: String,
    data: mongoose.Schema.Types.Mixed,
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
