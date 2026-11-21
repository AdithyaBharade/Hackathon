import { Router } from "express";
import rateLimit from "express-rate-limit";
import { certificateController } from "../controllers/certificate.controller.js";
import { validate } from "../middlewares/validate.js";
import { certificateNumberParam, pdfQuerySchema } from "../validators/certificate.validator.js";

/** No login. Rate-limited per IP so the register can't be scraped by brute force. */
const router = Router();
const limiter = rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: true, legacyHeaders: false });
router.use(limiter);
router.get("/verify/:number", validate(certificateNumberParam, "params"), certificateController.verify);
router.get("/certificates/:number/pdf", validate(certificateNumberParam, "params"), validate(pdfQuerySchema, "query"), certificateController.pdf);
export default router;
