import { Router } from "express";
import { certificateController } from "../controllers/certificate.controller.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { idParamSchema } from "../validators/common.validator.js";
import { listCertificatesSchema, revokeSchema } from "../validators/certificate.validator.js";

const router = Router();
router.use(authenticate);
router.get("/", validate(listCertificatesSchema, "query"), certificateController.list);
router.get("/:id/timeline", validate(idParamSchema, "params"), certificateController.timeline);
router.post("/:id/revoke", authorize("STATE"), validate(idParamSchema, "params"), validate(revokeSchema), certificateController.revoke);
router.post("/:id/resend", authorize("STATE"), validate(idParamSchema, "params"), certificateController.resend);
export default router;
