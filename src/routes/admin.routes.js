const router = require("express").Router();
const c = require("../controllers/admin.controller");
const validate = require("../middleware/validate");
const v = require("../validators/order.validator");
const { authenticate, authorize } = require("../middleware/auth");
const { ROLES } = require("../constants/roles");

router.use(authenticate, authorize(ROLES.ADMIN, ROLES.FACILITY_STAFF));

router.get("/orders", c.listOrders);
router.get("/orders/:id", c.orderDetail);
router.patch("/orders/:id/status", validate(v.updateStatus), c.updateStatus);
router.patch("/orders/:id/inspection", validate(v.inspection), c.finalizeInspection);

// Admin-only
router.patch("/orders/:id/assign-driver", authorize(ROLES.ADMIN), validate(v.assignDriver), c.assignDriver);
router.patch("/orders/:id/assign-facility", authorize(ROLES.ADMIN), c.assignFacility);

module.exports = router;
