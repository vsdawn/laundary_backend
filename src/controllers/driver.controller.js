const asyncHandler = require("../utils/asyncHandler");
const driverService = require("../services/driver.service");

exports.list = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await driverService.listTasks(req.user.id, req.query) });
});

exports.detail = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await driverService.getTask(req.params.id, req.user.id) });
});

exports.accept = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await driverService.accept(req.params.id, req.user.id) });
});

exports.arrived = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await driverService.arrived(req.params.id, req.user.id) });
});

exports.complete = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await driverService.complete(req.params.id, req.user.id, req.body.otp) });
});

exports.location = asyncHandler(async (req, res) => {
  await driverService.updateLocation(req.user.id, req.body);
  res.json({ success: true });
});
