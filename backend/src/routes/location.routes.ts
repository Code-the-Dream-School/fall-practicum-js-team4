import { Router } from "express";
import validate from "../middleware/validate";
import { zipParamsSchema } from "../validators/location.validator";
import { getZipLocztion } from "../controllers/location.controller";

const router = Router();

router.get("/zip/:zip", validate(zipParamsSchema, "params"), getZipLocztion);

export default router;
