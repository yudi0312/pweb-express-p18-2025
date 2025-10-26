"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.login = exports.register = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errorHandler_1 = require("../utils/errorHandler");
const errorMiddleware_1 = require("../middleware/errorMiddleware");
const JWT_SECRET = process.env.JWT_SECRET || "secret";
exports.register = (0, errorMiddleware_1.catchAsync)(async (req, res, next) => {
    const { username, email, password } = req.body;
    // Validation
    if (!email) {
        throw new errorHandler_1.ValidationError("Email is required", "email");
    }
    if (!password) {
        throw new errorHandler_1.ValidationError("Password is required", "password");
    }
    if (!email.includes("@")) {
        throw new errorHandler_1.ValidationError("Email format is invalid", "email");
    }
    if (password.length < 6) {
        throw new errorHandler_1.ValidationError("Password must be at least 6 characters", "password");
    }
    // Check if email already exists
    const existing = await prisma_1.default.user.findUnique({ where: { email } });
    if (existing) {
        throw new errorHandler_1.ConflictError("Email already registered");
    }
    // Hash password
    const hashed = await bcrypt_1.default.hash(password, 10);
    // Create user
    console.log("🔄 Creating user with email:", email);
    const user = await prisma_1.default.user.create({
        data: { username: username || email.split("@")[0], email, password: hashed },
    });
    console.log("✅ User created successfully:", user.id);
    res.status(201).json({
        status: true,
        message: "User registered successfully",
        data: { id: user.id, email: user.email, username: user.username },
    });
});
exports.login = (0, errorMiddleware_1.catchAsync)(async (req, res, next) => {
    const { email, password } = req.body;
    // Validation
    if (!email) {
        throw new errorHandler_1.ValidationError("Email is required", "email");
    }
    if (!password) {
        throw new errorHandler_1.ValidationError("Password is required", "password");
    }
    // Find user
    const user = await prisma_1.default.user.findUnique({ where: { email } });
    if (!user) {
        throw new errorHandler_1.AuthenticationError("Invalid email or password");
    }
    // Verify password
    const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
    if (!isPasswordValid) {
        throw new errorHandler_1.AuthenticationError("Invalid email or password");
    }
    // Generate JWT token
    const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "1d" });
    res.json({
        status: true,
        message: "Login successful",
        data: { access_token: token },
    });
});
exports.getMe = (0, errorMiddleware_1.catchAsync)(async (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) {
        throw new errorHandler_1.AuthenticationError("User ID not found in token");
    }
    const user = await prisma_1.default.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, username: true, created_at: true },
    });
    if (!user) {
        throw new errorHandler_1.NotFoundError("User", userId);
    }
    res.json({ status: true, data: user });
});
