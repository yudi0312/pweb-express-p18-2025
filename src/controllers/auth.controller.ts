import { Request, Response } from "express";
import prisma from "../prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "secret";

// REGISTER
export const register = async (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ status: false, message: "Email and password are required" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(400).json({ status: false, message: "Email already registered" });
  }

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { username, email, password: hashed },
  });

  return res.status(201).json({
    status: true,
    message: "User registered successfully",
    data: { id: user.id, email: user.email },
  });
};

// LOGIN
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ status: false, message: "Email and password are required" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ status: false, message: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ status: false, message: "Invalid credentials" });
  }

  const token = jwt.sign(
  { id: user.id, email: user.email },
  process.env.JWT_SECRET!,
  { expiresIn: "1d" }
);

  return res.json({
    status: true,
    message: "Login successful",
    data: { access_token: token },
  });
};

// GET ME
export const getMe = async (req: any, res: Response) => {
  const userId = req.user?.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, username: true, created_at: true },
  });

  if (!user) return res.status(404).json({ status: false, message: "User not found" });

  res.json({ status: true, data: user });
};
