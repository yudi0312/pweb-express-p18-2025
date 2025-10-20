import { Router } from "express";
import {
  createBook,
  getAllBooks,
  getBookDetail,
  updateBook,
  deleteBook,
} from "../controllers/books.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Hanya user login yang boleh tambah / edit / hapus buku
router.post("/", authenticate, createBook);
router.get("/", getAllBooks);
router.get("/:book_id", getBookDetail);
router.patch("/:book_id", authenticate, updateBook);
router.delete("/:book_id", authenticate, deleteBook);

export default router;
