const router = require("express").Router();
const c = require("../controllers/customer.controller");
const { authenticate, authorize } = require("../middleware/auth");
const { ROLES } = require("../constants/roles");

router.use(authenticate, authorize(ROLES.CUSTOMER));

router.get("/me", c.getMe);
router.patch("/me", c.updateMe);
router.post("/me/fcm-token", c.registerFcmToken);

module.exports = router;
