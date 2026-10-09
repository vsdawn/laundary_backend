const router = require("express").Router();

router.use("/auth", require("./auth.routes"));
router.use("/customers", require("./customer.routes"));
router.use("/addresses", require("./address.routes"));
router.use("/services", require("./service.routes"));
router.use("/orders", require("./order.routes"));
router.use("/admin", require("./admin.routes"));
router.use("/driver", require("./driver.routes"));

module.exports = router;
