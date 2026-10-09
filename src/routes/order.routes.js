const router = require("express").Router();
const c = require("../controllers/order.controller");
const validate = require("../middleware/validate");
const v = require("../validators/order.validator");
const { authenticate, authorize } = require("../middleware/auth");
const { ROLES } = require("../constants/roles");

router.use(authenticate, authorize(ROLES.CUSTOMER));

router.post("/", validate(v.createOrder), c.create);
router.get("/", c.list);
router.get("/:orderId", c.detail);
router.patch("/:orderId/cancel", validate(v.cancelOrder), c.cancel);

module.exports = router;
