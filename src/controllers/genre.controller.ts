import { Request, Response } from "express";
import prisma from "../prisma";

/**
 * CREATE GENRE
 * POST /genre
 */
export const createGenre = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ status: false, message: "Genre name is required" });
    }

    const existing = await prisma.genre.findUnique({ where: { name } });
    if (existing) {
      return res.status(400).json({ status: false, message: "Genre already exists" });
    }

    const genre = await prisma.genre.create({
      data: {
        name,
      },
    });

    res.status(201).json({ status: true, message: "Genre created", data: genre });
  } catch (err) {
    res.status(500).json({ status: false, message: "Failed to create genre" });
  }
};

/**
 * GET ALL GENRES
 * GET /genre
 */
export const getAllGenres = async (_: Request, res: Response) => {
  try {
    const genres = await prisma.genre.findMany({
      where: { deleted_at: null },
    });
    res.json({ status: true, data: genres });
  } catch (err) {
    res.status(500).json({ status: false, message: "Failed to fetch genres" });
  }
};

/**
 * GET GENRE DETAIL
 * GET /genre/:genre_id
 */
export const getGenreDetail = async (req: Request, res: Response) => {
  try {
    const id = req.params.genre_id;
    const genre = await prisma.genre.findUnique({ where: { id } });

    if (!genre || genre.deleted_at) {
      return res.status(404).json({ status: false, message: "Genre not found" });
    }

    res.json({ status: true, data: genre });
  } catch (err) {
    res.status(500).json({ status: false, message: "Failed to get genre detail" });
  }
};

/**
 * UPDATE GENRE
 * PATCH /genre/:genre_id
 */
export const updateGenre = async (req: Request, res: Response) => {
  try {
    const id = req.params.genre_id;
    const { name } = req.body;

    const genre = await prisma.genre.findUnique({ where: { id } });
    if (!genre) return res.status(404).json({ status: false, message: "Genre not found" });

    const updated = await prisma.genre.update({
      where: { id },
      data: { name, updated_at: new Date() },
    });

    res.json({ status: true, message: "Genre updated", data: updated });
  } catch (err) {
    res.status(500).json({ status: false, message: "Failed to update genre" });
  }
};

/**
 * DELETE GENRE (soft delete)
 * DELETE /genre/:genre_id
 */
export const deleteGenre = async (req: Request, res: Response) => {
  try {
    const id = req.params.genre_id;
    const genre = await prisma.genre.findUnique({ where: { id } });

    if (!genre) return res.status(404).json({ status: false, message: "Genre not found" });

    const deleted = await prisma.genre.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    res.json({ status: true, message: "Genre deleted (soft delete)", data: deleted });
  } catch (err) {
    res.status(500).json({ status: false, message: "Failed to delete genre" });
  }
};
