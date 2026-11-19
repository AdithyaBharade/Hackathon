import { Router } from "express";
import { userController } from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { updateUserSchema } from "../validators/user.validator.js";

const router = Router();

router.use(authenticate);
router.get("/", userController.getAll);
router.get("/:id", userController.getById);
router.put("/:id", validate(updateUserSchema), userController.update);
router.delete("/:id", userController.remove); // add authorize("ADMIN") if needed

export default router;
