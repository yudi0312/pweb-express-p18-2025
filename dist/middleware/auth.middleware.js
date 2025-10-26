"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../prisma"));
const errorHandler_1 = require("../utils/errorHandler");
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            throw new errorHandler_1.AuthenticationError("Authorization header is required");
        }
        if (!authHeader.startsWith("Bearer ")) {
            throw new errorHandler_1.AuthenticationError("Invalid authorization header format. Use 'Bearer <token>'");
        }
        const token = authHeader.split(" ")[1];
        if (!token) {
            throw new errorHandler_1.AuthenticationError("Token is required");
        }
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        }
        catch (err) {
            if (err.name === "TokenExpiredError") {
                throw new errorHandler_1.AuthenticationError("Token has expired");
            }
            else if (err.name === "JsonWebTokenError") {
                throw new errorHandler_1.AuthenticationError("Invalid token");
            }
            throw new errorHandler_1.AuthenticationError("Token verification failed");
        }
        const user = await prisma_1.default.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, email: true, username: true, created_at: true },
        });
        if (!user) {
            throw new errorHandler_1.NotFoundError("User", decoded.id);
        }
        req.user = user;
        next();
    }
    catch (err) {
        next(err);
    }
};
exports.authenticate = authenticate;
