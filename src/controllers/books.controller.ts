import { Request, Response, NextFunction } from "express";
import prisma from "../prisma";
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  InternalServerError,
} from "../utils/errorHandler";
import { catchAsync } from "../middleware/errorMiddleware";

export const createBook = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
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

  // Validation
  if (!title) throw new ValidationError("Title is required", "title");
  if (!writer) throw new ValidationError("Writer is required", "writer");
  if (!publisher) throw new ValidationError("Publisher is required", "publisher");
  if (!publication_year) throw new ValidationError("Publication year is required", "publication_year");
  if (price === undefined) throw new ValidationError("Price is required", "price");
  if (stock_quantity === undefined) throw new ValidationError("Stock quantity is required", "stock_quantity");
  if (!genre_id) throw new ValidationError("Genre ID is required", "genre_id");

  // Validate numeric values
  if (isNaN(Number(publication_year))) {
    throw new ValidationError("Publication year must be a number", "publication_year");
  }
  if (isNaN(Number(price)) || Number(price) < 0) {
    throw new ValidationError("Price must be a positive number", "price");
  }
  if (isNaN(Number(stock_quantity)) || Number(stock_quantity) < 0) {
    throw new ValidationError("Stock quantity must be a positive number", "stock_quantity");
  }
  // Validate stock quantity is integer (not float)
  if (!Number.isInteger(Number(stock_quantity))) {
    throw new ValidationError("Stock quantity must be an integer, not a decimal number", "stock_quantity");
  }

  // Check if genre exists
  const genre = await prisma.genre.findUnique({ where: { id: genre_id } });
  if (!genre) {
    throw new NotFoundError("Genre", genre_id);
  }

  // Check if book title already exists
  const existingBook = await prisma.book.findUnique({ where: { title } });
  if (existingBook) {
    throw new ConflictError("Book title already exists");
  }

  // Create book
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
    include: { genre: true },
  });

  res.status(201).json({ status: true, message: "Book created", data: newBook });
});

export const getAllBooks = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const page = parseInt((req.query.page as string) || "1");
  const limit = parseInt((req.query.limit as string) || "10");
  const q = (req.query.q as string) || "";

  // Validation
  if (page < 1) throw new ValidationError("Page must be at least 1", "page");
  if (limit < 1 || limit > 100) {
    throw new ValidationError("Limit must be between 1 and 100", "limit");
  }

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
      orderBy: { created_at: "desc" },
    }),
  ]);

  res.json({
    status: true,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
    data: books,
  });
});

export const getBooksByGenre = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const genre_id = req.params.genre_id;
  const page = parseInt((req.query.page as string) || "1");
  const limit = parseInt((req.query.limit as string) || "10");
  const q = (req.query.q as string) || "";

  // Validation
  if (!genre_id) throw new ValidationError("Genre ID is required", "genre_id");
  if (page < 1) throw new ValidationError("Page must be at least 1", "page");
  if (limit < 1 || limit > 100) {
    throw new ValidationError("Limit must be between 1 and 100", "limit");
  }

  // Check if genre exists
  const genre = await prisma.genre.findUnique({ where: { id: genre_id } });
  if (!genre) {
    throw new NotFoundError("Genre", genre_id);
  }

  const where = {
    genre_id: genre_id,
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
      orderBy: { created_at: "desc" },
    }),
  ]);

  res.json({
    status: true,
    message: `Found ${total} books in "${genre.name}" genre`,
    meta: { total, page, limit, pages: Math.ceil(total / limit), genre_id, genre_name: genre.name },
    data: books,
  });
});

export const getBookDetail = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const id = req.params.book_id;

  if (!id) throw new ValidationError("Book ID is required", "book_id");

  const book = await prisma.book.findUnique({
    where: { id },
    include: { genre: true },
  });

  if (!book || book.deleted_at) {
    throw new NotFoundError("Book", id);
  }

  res.json({ status: true, data: book });
});

export const updateBook = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const id = req.params.book_id;
  const data = req.body;

  if (!id) throw new ValidationError("Book ID is required", "book_id");

  // Find existing book
  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) {
    throw new NotFoundError("Book", id);
  }

  // Validate numeric fields if provided
  if (data.publication_year && isNaN(Number(data.publication_year))) {
    throw new ValidationError("Publication year must be a number", "publication_year");
  }
  if (data.price !== undefined && (isNaN(Number(data.price)) || Number(data.price) < 0)) {
    throw new ValidationError("Price must be a positive number", "price");
  }
  if (data.stock_quantity !== undefined && (isNaN(Number(data.stock_quantity)) || Number(data.stock_quantity) < 0)) {
    throw new ValidationError("Stock quantity must be a positive number", "stock_quantity");
  }
  // Validate stock quantity is integer (not float)
  if (data.stock_quantity !== undefined && !Number.isInteger(Number(data.stock_quantity))) {
    throw new ValidationError("Stock quantity must be an integer, not a decimal number", "stock_quantity");
  }

  // Check for duplicate title if updating
  if (data.title && data.title !== book.title) {
    const duplicate = await prisma.book.findUnique({ where: { title: data.title } });
    if (duplicate) {
      throw new ConflictError("Book title already exists");
    }
  }

  // Check if genre exists if updating
  if (data.genre_id && data.genre_id !== book.genre_id) {
    const genre = await prisma.genre.findUnique({ where: { id: data.genre_id } });
    if (!genre) {
      throw new NotFoundError("Genre", data.genre_id);
    }
  }

  // Update book
  const updated = await prisma.book.update({
    where: { id },
    data: {
      ...data,
      publication_year: data.publication_year ? Number(data.publication_year) : book.publication_year,
      price: data.price !== undefined ? Number(data.price) : book.price,
      stock_quantity: data.stock_quantity !== undefined ? Number(data.stock_quantity) : book.stock_quantity,
      updated_at: new Date(),
    },
    include: { genre: true },
  });

  res.json({ status: true, message: "Book updated", data: updated });
});

export const deleteBook = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const id = req.params.book_id;

  if (!id) throw new ValidationError("Book ID is required", "book_id");

  // Find book
  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) {
    throw new NotFoundError("Book", id);
  }

  // Check if already deleted
  if (book.deleted_at) {
    throw new ValidationError(`Book with id ${id} has already been deleted`, "book_id");
  }

  // Soft delete
  const deleted = await prisma.book.update({
    where: { id },
    data: { deleted_at: new Date() },
    include: { genre: true },
  });

  res.json({ status: true, message: "Book deleted (soft delete)", data: deleted });
});
