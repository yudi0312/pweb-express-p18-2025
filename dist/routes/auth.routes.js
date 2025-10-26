"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const prisma_1 = __importDefault(require("../prisma"));
const router = (0, express_1.Router)();
router.post("/register", auth_controller_1.register);
router.post("/login", auth_controller_1.login);
router.get("/me", auth_middleware_1.authenticate, auth_controller_1.getMe);
// Debug endpoint - test database connection
router.get("/test-db", async (req, res) => {
    try {
        const users = await prisma_1.default.user.findMany();
        res.json({
            status: true,
            message: "Database connection successful",
            users: users,
            count: users.length,
        });
    }
    catch (error) {
        res.status(500).json({
            status: false,
            message: "Database connection failed",
            error: error.message,
        });
    }
});
exports.default = router;
