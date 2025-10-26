import { Request, Response, NextFunction } from "express";
import prisma from "../prisma";
import {
  ValidationError,
  NotFoundError,
  ConflictError,
} from "../utils/errorHandler";
import { catchAsync } from "../middleware/errorMiddleware";

export const createGenre = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { name } = req.body;

  // Validation
  if (!name) {
    throw new ValidationError("Genre name is required", "name");
  }
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new ValidationError("Genre name must be a non-empty string", "name");
  }
  if (name.length > 100) {
    throw new ValidationError("Genre name must not exceed 100 characters", "name");
  }

  // Check if genre already exists
  const existing = await prisma.genre.findUnique({ where: { name: name.trim() } });
  if (existing) {
    throw new ConflictError("Genre name already exists");
  }

  // Create genre
  const genre = await prisma.genre.create({
    data: {
      name: name.trim(),
    },
  });

  res.status(201).json({ status: true, message: "Genre created", data: genre });
});

export const getAllGenres = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const genres = await prisma.genre.findMany({
    where: { deleted_at: null },
    orderBy: { created_at: "desc" },
  });

  res.json({ status: true, data: genres });
});

export const getGenreDetail = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const id = req.params.genre_id;

  if (!id) {
    throw new ValidationError("Genre ID is required", "genre_id");
  }

  const genre = await prisma.genre.findUnique({ where: { id } });

  if (!genre || genre.deleted_at) {
    throw new NotFoundError("Genre", id);
  }

  res.json({ status: true, data: genre });
});

export const updateGenre = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const id = req.params.genre_id;
  const { name } = req.body;

  if (!id) {
    throw new ValidationError("Genre ID is required", "genre_id");
  }

  // Validation
  if (!name) {
    throw new ValidationError("Genre name is required", "name");
  }
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new ValidationError("Genre name must be a non-empty string", "name");
  }
  if (name.length > 100) {
    throw new ValidationError("Genre name must not exceed 100 characters", "name");
  }

  // Find existing genre
  const genre = await prisma.genre.findUnique({ where: { id } });
  if (!genre) {
    throw new NotFoundError("Genre", id);
  }

  // Check for duplicate name if updating
  if (name.trim() !== genre.name) {
    const duplicate = await prisma.genre.findUnique({ where: { name: name.trim() } });
    if (duplicate) {
      throw new ConflictError("Genre name already exists");
    }
  }

  // Update genre
  const updated = await prisma.genre.update({
    where: { id },
    data: { name: name.trim(), updated_at: new Date() },
  });

  res.json({ status: true, message: "Genre updated", data: updated });
});

export const deleteGenre = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const id = req.params.genre_id;

  if (!id) {
    throw new ValidationError("Genre ID is required", "genre_id");
  }

  // Find genre
  const genre = await prisma.genre.findUnique({ where: { id } });
  if (!genre) {
    throw new NotFoundError("Genre", id);
  }

  // Check if genre is used by any books
  const booksCount = await prisma.book.count({
    where: { genre_id: id, deleted_at: null },
  });
  if (booksCount > 0) {
    throw new ValidationError(
      `Cannot delete genre that has ${booksCount} book(s) assigned to it`,
      "genre_id"
    );
  }

  // Soft delete
  const deleted = await prisma.genre.update({
    where: { id },
    data: { deleted_at: new Date() },
  });

  res.json({ status: true, message: "Genre deleted (soft delete)", data: deleted });
});
