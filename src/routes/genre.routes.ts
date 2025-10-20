import { Router } from "express";
import {
  createGenre,
  getAllGenres,
  getGenreDetail,
  updateGenre,
  deleteGenre,
} from "../controllers/genre.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// hanya user login yang bisa create/update/delete genre
router.post("/", authenticate, createGenre);
router.get("/", getAllGenres);
router.get("/:genre_id", getGenreDetail);
router.patch("/:genre_id", authenticate, updateGenre);
router.delete("/:genre_id", authenticate, deleteGenre);

export default router;
