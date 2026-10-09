const router = require("express").Router();
const c = require("../controllers/auth.controller");
const validate = require("../middleware/validate");
const v = require("../validators/auth.validator");
const { authenticate } = require("../middleware/auth");

router.post("/send-otp", validate(v.sendOtp), c.sendOtp);
router.post("/verify-otp", validate(v.verifyOtp), c.verifyOtp);
router.post("/refresh-token", validate(v.refresh), c.refreshToken);
router.post("/logout", authenticate, c.logout);

module.exports = router;
