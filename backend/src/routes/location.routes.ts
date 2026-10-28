import { Router } from "express";
import validate from "../middleware/validate";
import { zipParamsSchema } from "../validators/location.validators";
import { getZipLocation } from "../controllers/location.controller";

const router = Router();

router.get("/zip/:zip", validate(zipParamsSchema, "params"), getZipLocation);

export default router;
