import { Router } from "express";
import { register, login, getMe } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import prisma from "../prisma";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticate, getMe);

// Debug endpoint - test database connection
router.get("/test-db", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json({
      status: true,
      message: "Database connection successful",
      users: users,
      count: users.length,
    });
  } catch (error: any) {
    res.status(500).json({
      status: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
});

export default router;