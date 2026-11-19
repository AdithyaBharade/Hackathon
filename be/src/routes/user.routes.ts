import { Router } from "express";
import { userController } from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { idParamSchema, paginationSchema } from "../validators/common.validator.js";
import { updateUserSchema } from "../validators/user.validator.js";

const router = Router();

router.use(authenticate);
router.get("/", validate(paginationSchema, "query"), userController.getAll);
router.get("/:id", validate(idParamSchema, "params"), userController.getById);
router.put("/:id", validate(idParamSchema, "params"), validate(updateUserSchema), userController.update);
router.delete("/:id", validate(idParamSchema, "params"), userController.remove); // add authorize("ADMIN") if needed

export default router;
