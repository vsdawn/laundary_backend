const router = require("express").Router();
const c = require("../controllers/driver.controller");
const validate = require("../middleware/validate");
const v = require("../validators/order.validator");
const { authenticate, authorize } = require("../middleware/auth");
const { ROLES } = require("../constants/roles");

router.use(authenticate, authorize(ROLES.DRIVER));

router.get("/tasks", c.list);
router.get("/tasks/:id", c.detail);
router.patch("/tasks/:id/accept", c.accept);
router.patch("/tasks/:id/arrived", c.arrived);
router.patch("/tasks/:id/complete", validate(v.completeTask), c.complete);
router.post("/location", validate(v.location), c.location);

module.exports = router;
