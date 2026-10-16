const express = require("express");
const router = express.Router();
const { getHello } = require("../controllers/hello.controller");

// GET /api/hello
router.get("/", getHello);

module.exports = router;
