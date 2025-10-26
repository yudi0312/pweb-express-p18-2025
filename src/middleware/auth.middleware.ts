import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../prisma";
import { AuthenticationError, NotFoundError } from "../utils/errorHandler";

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AuthenticationError("Authorization header is required");
    }

    if (!authHeader.startsWith("Bearer ")) {
      throw new AuthenticationError("Invalid authorization header format. Use 'Bearer <token>'");
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new AuthenticationError("Token is required");
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (err: any) {
      if (err.name === "TokenExpiredError") {
        throw new AuthenticationError("Token has expired");
      } else if (err.name === "JsonWebTokenError") {
        throw new AuthenticationError("Invalid token");
      }
      throw new AuthenticationError("Token verification failed");
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, username: true, created_at: true },
    });

    if (!user) {
      throw new NotFoundError("User", decoded.id);
    }

    (req as any).user = user;

    next();
  } catch (err) {
    next(err);
  }
};
