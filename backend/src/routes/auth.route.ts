import { Router } from "express"
import {
  getMeHandler,
  listBranchOfficesHandler,
  loginHandler,
  logoutHandler,
  registerHandler,
  resetPasswordHandler,
} from "@/handlers/auth.handler"
import { authenticate, authorize } from "@/middlewares/auth"

const router: Router = Router()

router.post("/register", registerHandler)
router.post("/login", loginHandler)
router.post("/logout", authenticate, logoutHandler)
router.get("/me", authenticate, getMeHandler)
router.get("/branch-offices", authenticate, listBranchOfficesHandler)
router.post(
  "/reset-password",
  authenticate,
  authorize("admin"),
  resetPasswordHandler,
)

export { router as authRouter }
