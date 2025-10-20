import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import bookRoutes from "./routes/books.routes";
import genreRoutes from "./routes/genre.routes";
import transactionRoutes from "./routes/transaction.routes";

const app = express();

app.use(cors());            // Mengizinkan akses API dari browser mana pun
app.use(express.json());    // Agar Express bisa membaca body JSON
app.use("/auth", authRoutes);
app.use("/books", bookRoutes);
app.use("/genre", genreRoutes);
app.use("/transactions", transactionRoutes);

// route awal (tes server)
app.get("/", (req, res) => {
  res.json({ message: "IT Literature Shop API is running!" });
});

export default app;
