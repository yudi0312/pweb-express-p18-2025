import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import bookRoutes from "./routes/books.routes";
import genreRoutes from "./routes/genre.routes";
import transactionRoutes from "./routes/transaction.routes";
import { errorMiddleware } from "./middleware/errorMiddleware";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/auth", authRoutes);
app.use("/books", bookRoutes);
app.use("/genre", genreRoutes);
app.use("/transactions", transactionRoutes);

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
app.use(errorMiddleware);

export default app;
