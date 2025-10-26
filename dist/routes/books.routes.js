"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const books_controller_1 = require("../controllers/books.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Hanya user login yang boleh tambah / edit / hapus buku
router.post("/", auth_middleware_1.authenticate, books_controller_1.createBook);
router.get("/", books_controller_1.getAllBooks);
router.get("/genre/:genre_id", books_controller_1.getBooksByGenre);
router.get("/:book_id", books_controller_1.getBookDetail);
router.patch("/:book_id", auth_middleware_1.authenticate, books_controller_1.updateBook);
router.delete("/:book_id", auth_middleware_1.authenticate, books_controller_1.deleteBook);
exports.default = router;
