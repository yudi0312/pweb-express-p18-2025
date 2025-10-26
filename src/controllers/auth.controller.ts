import { Request, Response, NextFunction } from "express";
import prisma from "../prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  ValidationError,
  AuthenticationError,
  NotFoundError,
  ConflictError,
  InternalServerError,
} from "../utils/errorHandler";
import { catchAsync } from "../middleware/errorMiddleware";

const JWT_SECRET = process.env.JWT_SECRET || "secret";

export const register = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { username, email, password } = req.body;

  // Validation
  if (!email) {
    throw new ValidationError("Email is required", "email");
  }
  if (!password) {
    throw new ValidationError("Password is required", "password");
  }
  if (!email.includes("@")) {
    throw new ValidationError("Email format is invalid", "email");
  }
  if (password.length < 6) {
    throw new ValidationError("Password must be at least 6 characters", "password");
  }

  // Check if email already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ConflictError("Email already registered");
  }

  // Hash password
  const hashed = await bcrypt.hash(password, 10);

  // Create user
  console.log("🔄 Creating user with email:", email);
  const user = await prisma.user.create({
    data: { username: username || email.split("@")[0], email, password: hashed },
  });
  console.log("✅ User created successfully:", user.id);

  res.status(201).json({
    status: true,
    message: "User registered successfully",
    data: { id: user.id, email: user.email, username: user.username },
  });
});

export const login = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  // Validation
  if (!email) {
    throw new ValidationError("Email is required", "email");
  }
  if (!password) {
    throw new ValidationError("Password is required", "password");
  }

  // Find user
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AuthenticationError("Invalid email or password");
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AuthenticationError("Invalid email or password");
  }

  // Generate JWT token
  const token = jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.json({
    status: true,
    message: "Login successful",
    data: { access_token: token },
  });
});

export const getMe = catchAsync(async (req: any, res: Response, next: NextFunction) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new AuthenticationError("User ID not found in token");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, username: true, created_at: true },
  });

  if (!user) {
    throw new NotFoundError("User", userId);
  }

  res.json({ status: true, data: user });
});
