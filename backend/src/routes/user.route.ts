import { Router } from "express"
import {
  changePasswordHandler,
  createUserHandler,
  deleteUserHandler,
  getUserHandler,
  listUsersHandler,
  updateUserHandler,
} from "@/handlers/user.handler"
import { authenticate, authorize } from "@/middlewares/auth"

const router: Router = Router()

// Semua route hanya untuk admin
router.use(authenticate, authorize("admin"))

router.get("/", listUsersHandler)
router.get("/:id", getUserHandler)
router.post("/", createUserHandler)
router.put("/:id", updateUserHandler)
router.delete("/:id", deleteUserHandler)
router.post("/:id/change-password", changePasswordHandler)

export { router as userRouter }
