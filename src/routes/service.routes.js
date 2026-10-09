const router = require("express").Router();
const c = require("../controllers/service.controller");

// Public — catalog can be browsed before login
router.get("/", c.list);
router.get("/:id", c.get);
router.get("/:id/items", c.items);

module.exports = router;
