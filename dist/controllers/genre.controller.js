"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteGenre = exports.updateGenre = exports.getGenreDetail = exports.getAllGenres = exports.createGenre = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const errorHandler_1 = require("../utils/errorHandler");
const errorMiddleware_1 = require("../middleware/errorMiddleware");
exports.createGenre = (0, errorMiddleware_1.catchAsync)(async (req, res, next) => {
    const { name } = req.body;
    // Validation
    if (!name) {
        throw new errorHandler_1.ValidationError("Genre name is required", "name");
    }
    if (typeof name !== "string" || name.trim().length === 0) {
        throw new errorHandler_1.ValidationError("Genre name must be a non-empty string", "name");
    }
    if (name.length > 100) {
        throw new errorHandler_1.ValidationError("Genre name must not exceed 100 characters", "name");
    }
    // Check if genre already exists
    const existing = await prisma_1.default.genre.findUnique({ where: { name: name.trim() } });
    if (existing) {
        throw new errorHandler_1.ConflictError("Genre name already exists");
    }
    // Create genre
    const genre = await prisma_1.default.genre.create({
        data: {
            name: name.trim(),
        },
    });
    res.status(201).json({ status: true, message: "Genre created", data: genre });
});
exports.getAllGenres = (0, errorMiddleware_1.catchAsync)(async (req, res, next) => {
    const genres = await prisma_1.default.genre.findMany({
        where: { deleted_at: null },
        orderBy: { created_at: "desc" },
    });
    res.json({ status: true, data: genres });
});
exports.getGenreDetail = (0, errorMiddleware_1.catchAsync)(async (req, res, next) => {
    const id = req.params.genre_id;
    if (!id) {
        throw new errorHandler_1.ValidationError("Genre ID is required", "genre_id");
    }
    const genre = await prisma_1.default.genre.findUnique({ where: { id } });
    if (!genre || genre.deleted_at) {
        throw new errorHandler_1.NotFoundError("Genre", id);
    }
    res.json({ status: true, data: genre });
});
exports.updateGenre = (0, errorMiddleware_1.catchAsync)(async (req, res, next) => {
    const id = req.params.genre_id;
    const { name } = req.body;
    if (!id) {
        throw new errorHandler_1.ValidationError("Genre ID is required", "genre_id");
    }
    // Validation
    if (!name) {
        throw new errorHandler_1.ValidationError("Genre name is required", "name");
    }
    if (typeof name !== "string" || name.trim().length === 0) {
        throw new errorHandler_1.ValidationError("Genre name must be a non-empty string", "name");
    }
    if (name.length > 100) {
        throw new errorHandler_1.ValidationError("Genre name must not exceed 100 characters", "name");
    }
    // Find existing genre
    const genre = await prisma_1.default.genre.findUnique({ where: { id } });
    if (!genre) {
        throw new errorHandler_1.NotFoundError("Genre", id);
    }
    // Check for duplicate name if updating
    if (name.trim() !== genre.name) {
        const duplicate = await prisma_1.default.genre.findUnique({ where: { name: name.trim() } });
        if (duplicate) {
            throw new errorHandler_1.ConflictError("Genre name already exists");
        }
    }
    // Update genre
    const updated = await prisma_1.default.genre.update({
        where: { id },
        data: { name: name.trim(), updated_at: new Date() },
    });
    res.json({ status: true, message: "Genre updated", data: updated });
});
exports.deleteGenre = (0, errorMiddleware_1.catchAsync)(async (req, res, next) => {
    const id = req.params.genre_id;
    if (!id) {
        throw new errorHandler_1.ValidationError("Genre ID is required", "genre_id");
    }
    // Find genre
    const genre = await prisma_1.default.genre.findUnique({ where: { id } });
    if (!genre) {
        throw new errorHandler_1.NotFoundError("Genre", id);
    }
    // Check if genre is used by any books
    const booksCount = await prisma_1.default.book.count({
        where: { genre_id: id, deleted_at: null },
    });
    if (booksCount > 0) {
        throw new errorHandler_1.ValidationError(`Cannot delete genre that has ${booksCount} book(s) assigned to it`, "genre_id");
    }
    // Soft delete
    const deleted = await prisma_1.default.genre.update({
        where: { id },
        data: { deleted_at: new Date() },
    });
    res.json({ status: true, message: "Genre deleted (soft delete)", data: deleted });
});
