import { Router } from "express";
import multer from "multer";
import { batchController } from "../controllers/batch.controller.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { idParamSchema } from "../validators/common.validator.js";
import { createBatchSchema, decisionSchema, listBatchesSchema } from "../validators/batch.validator.js";
import { ApiError } from "../utils/ApiError.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    /\.(csv|xlsx)$/i.test(file.originalname) ? cb(null, true) : cb(new ApiError(400, "Only .csv or .xlsx files are accepted")),
});

const REVIEWERS = ["DISTRICT_OFFICER", "QUALITY", "STATE"] as const;
const router = Router();
router.use(authenticate);

router.get("/", validate(listBatchesSchema, "query"), batchController.list);
router.get("/summary", batchController.summary);
router.get("/stuck", authorize("STATE"), batchController.stuck);
router.post("/", authorize("CENTRE"), validate(createBatchSchema), batchController.create);
router.get("/:id", validate(idParamSchema, "params"), batchController.get);
router.get("/:id/timeline", validate(idParamSchema, "params"), batchController.timeline);
router.post("/:id/candidates", authorize("CENTRE"), validate(idParamSchema, "params"), upload.single("file"), batchController.upload);
router.post("/:id/submit", authorize("CENTRE"), validate(idParamSchema, "params"), batchController.submit);
router.post("/:id/decisions", authorize(...REVIEWERS), validate(idParamSchema, "params"), validate(decisionSchema), batchController.decide);
router.post("/:id/decisions/retract", authorize(...REVIEWERS), validate(idParamSchema, "params"), batchController.retract);

export default router;
