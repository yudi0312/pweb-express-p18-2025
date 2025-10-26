"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const books_routes_1 = __importDefault(require("./routes/books.routes"));
const genre_routes_1 = __importDefault(require("./routes/genre.routes"));
const transaction_routes_1 = __importDefault(require("./routes/transaction.routes"));
const errorMiddleware_1 = require("./middleware/errorMiddleware");
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use("/auth", auth_routes_1.default);
app.use("/books", books_routes_1.default);
app.use("/genre", genre_routes_1.default);
app.use("/transactions", transaction_routes_1.default);
// Health check endpoint
app.get("/", (req, res) => {
    res.json({
        status: true,
        message: "IT Literature Shop API is running!",
        version: "1.0.0",
        timestamp: new Date().toISOString()
    });
});
// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        status: false,
        message: "Endpoint not found",
        path: req.path,
        method: req.method,
    });
});
// Global Error Handler (must be last)
app.use(errorMiddleware_1.errorMiddleware);
exports.default = app;
