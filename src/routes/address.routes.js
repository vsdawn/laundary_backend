const router = require("express").Router();
const c = require("../controllers/address.controller");
const { authenticate, authorize } = require("../middleware/auth");
const { ROLES } = require("../constants/roles");

router.use(authenticate, authorize(ROLES.CUSTOMER));

router.route("/").post(c.create).get(c.list);
router.route("/:id").get(c.get).patch(c.update).delete(c.remove);

module.exports = router;
