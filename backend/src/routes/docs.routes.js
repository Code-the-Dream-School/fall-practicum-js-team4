const fs = require("fs");
const path = require("path");
const express = require("express");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yaml");

const spec = YAML.parse(fs.readFileSync(path.join(__dirname, "../../docs/openapi.yaml"), "utf8"));

const router = express.Router();

// Raw spec, e.g. for Postman: Import → Link → http://localhost:8080/api/docs/openapi.json
router.get("/openapi.json", (req, res) => res.json(spec));

// Interactive docs at /api/docs
router.use("/", swaggerUi.serve, swaggerUi.setup(spec));

module.exports = router;
