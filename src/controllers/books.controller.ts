import { Request, Response } from "express";
import prisma from "../prisma";

/**
 * CREATE BOOK
 * POST /books
 */
export const createBook = async (req: Request, res: Response) => {
  try {
    const {
      title,
      writer,
      publisher,
      publication_year,
      description,
      price,
      stock_quantity,
      genre_id,
    } = req.body;

    if (!title || !writer || !publisher || !publication_year || !price || !stock_quantity || !genre_id) {
      return res.status(400).json({ status: false, message: "Missing required fields" });
    }

    const existingBook = await prisma.book.findUnique({ where: { title } });
    if (existingBook) {
      return res.status(400).json({ status: false, message: "Book title already exists" });
    }

    const newBook = await prisma.book.create({
      data: {
        title,
        writer,
        publisher,
        publication_year: Number(publication_year),
        description,
        price: Number(price),
        stock_quantity: Number(stock_quantity),
        genre_id,
      },
    });

    res.status(201).json({ status: true, message: "Book created", data: newBook });
  } catch (err) {
    res.status(500).json({ status: false, message: "Failed to create book", error: err });
  }
};

/**
 * GET ALL BOOKS (with pagination & filter)
 * GET /books?page=1&limit=10&q=keyword
 */
export const getAllBooks = async (req: Request, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) || "1");
    const limit = parseInt((req.query.limit as string) || "10");
    const q = (req.query.q as string) || "";

    const where = {
      deleted_at: null,
      title: { contains: q, mode: "insensitive" as const },
    };

    const [total, books] = await Promise.all([
      prisma.book.count({ where }),
      prisma.book.findMany({
        where,
        include: { genre: true },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({
      status: true,
      meta: { total, page, limit },
      data: books,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: "Failed to fetch books" });
  }
};

/**
 * GET BOOK DETAIL
 * GET /books/:book_id
 */
export const getBookDetail = async (req: Request, res: Response) => {
  try {
    const id = req.params.book_id;
    const book = await prisma.book.findUnique({
      where: { id },
      include: { genre: true },
    });

    if (!book || book.deleted_at) {
      return res.status(404).json({ status: false, message: "Book not found" });
    }

    res.json({ status: true, data: book });
  } catch (err) {
    res.status(500).json({ status: false, message: "Failed to get book detail" });
  }
};

/**
 * UPDATE BOOK
 * PATCH /books/:book_id
 */
export const updateBook = async (req: Request, res: Response) => {
  try {
    const id = req.params.book_id;
    const data = req.body;

    const book = await prisma.book.findUnique({ where: { id } });
    if (!book) return res.status(404).json({ status: false, message: "Book not found" });

    if (data.title) {
      const duplicate = await prisma.book.findUnique({ where: { title: data.title } });
      if (duplicate && duplicate.id !== id) {
        return res.status(400).json({ status: false, message: "Title already exists" });
      }
    }

    const updated = await prisma.book.update({
      where: { id },
      data: {
        ...data,
        publication_year: data.publication_year ? Number(data.publication_year) : book.publication_year,
        price: data.price ? Number(data.price) : book.price,
        stock_quantity: data.stock_quantity ? Number(data.stock_quantity) : book.stock_quantity,
        updated_at: new Date(),
      },
    });

    res.json({ status: true, message: "Book updated", data: updated });
  } catch (err) {
    res.status(500).json({ status: false, message: "Failed to update book" });
  }
};

/**
 * DELETE BOOK (soft delete)
 * DELETE /books/:book_id
 */
export const deleteBook = async (req: Request, res: Response) => {
  try {
    const id = req.params.book_id;
    const book = await prisma.book.findUnique({ where: { id } });

    if (!book) return res.status(404).json({ status: false, message: "Book not found" });

    const deleted = await prisma.book.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    res.json({ status: true, message: "Book deleted (soft delete)", data: deleted });
  } catch (err) {
    res.status(500).json({ status: false, message: "Failed to delete book" });
  }
};
