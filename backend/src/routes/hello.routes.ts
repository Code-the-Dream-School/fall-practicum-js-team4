import express from "express";
import { getHello } from "../controllers/hello.controller";

const router = express.Router();

// GET /api/hello
router.get("/", getHello);

export default router;
