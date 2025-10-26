import { Request, Response, NextFunction } from "express";
import prisma from "../prisma";
import {
  ValidationError,
  NotFoundError,
  BusinessLogicError,
  AuthenticationError,
} from "../utils/errorHandler";
import { catchAsync } from "../middleware/errorMiddleware";

export const createTransaction = catchAsync(async (req: any, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const { items } = req.body;

  // Authentication validation
  if (!userId) {
    throw new AuthenticationError("User authentication required");
  }

  // Validation
  if (!items) {
    throw new ValidationError("Items array is required", "items");
  }
  if (!Array.isArray(items)) {
    throw new ValidationError("Items must be an array", "items");
  }
  if (items.length === 0) {
    throw new ValidationError("Items array cannot be empty", "items");
  }

  // Validate each item
  items.forEach((item, index) => {
    if (!item.book_id) {
      throw new ValidationError(`Item ${index + 1}: book_id is required`, "book_id");
    }
    if (!item.quantity || item.quantity < 1) {
      throw new ValidationError(`Item ${index + 1}: quantity must be at least 1`, "quantity");
    }
    // Validate quantity is integer (not float)
    if (!Number.isInteger(item.quantity)) {
      throw new ValidationError(`Item ${index + 1}: quantity must be an integer, not a decimal number`, "quantity");
    }
  });

  // Verify user exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError("User", userId);
  }

  // Create transaction with atomic operations
  const transaction = await prisma.$transaction(async (tx: any) => {
    // Create order
    const order = await tx.order.create({
      data: {
        user_id: userId,
      },
    });

    let totalPrice = 0;

    // Process each item
    for (const item of items) {
      // Check if book exists
      const book = await tx.book.findUnique({
        where: { id: item.book_id },
      });

      if (!book) {
        throw new NotFoundError("Book", item.book_id);
      }

      if (book.deleted_at) {
        throw new BusinessLogicError(`Book "${book.title}" has been deleted and cannot be purchased`);
      }

      // Check stock
      if (book.stock_quantity < item.quantity) {
        throw new BusinessLogicError(
          `Insufficient stock for "${book.title}". Available: ${book.stock_quantity}, Requested: ${item.quantity}`
        );
      }

      // Update stock
      await tx.book.update({
        where: { id: item.book_id },
        data: { stock_quantity: book.stock_quantity - item.quantity },
      });

      // Create order item
      await tx.orderItem.create({
        data: {
          order_id: order.id,
          book_id: item.book_id,
          quantity: item.quantity,
        },
      });

      totalPrice += book.price * item.quantity;
    }

    // Return complete order with items
    return await tx.order.findUnique({
      where: { id: order.id },
      include: {
        user: { select: { id: true, email: true, username: true } },
        items: {
          include: {
            book: { select: { id: true, title: true, price: true } },
          },
        },
      },
    });
  });

  res.status(201).json({
    status: true,
    message: "Transaction created successfully",
    data: transaction,
  });
});

export const getAllTransactions = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const transactions = await prisma.order.findMany({
    include: {
      user: { select: { id: true, email: true, username: true } },
      items: {
        include: {
          book: { select: { id: true, title: true, price: true, writer: true } },
        },
      },
    },
    orderBy: { created_at: "desc" },
  });

  res.json({ status: true, data: transactions });
});

export const getTransactionDetail = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const id = req.params.transaction_id;

  if (!id) {
    throw new ValidationError("Transaction ID is required", "transaction_id");
  }

  const transaction = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, username: true } },
      items: {
        include: { book: { select: { id: true, title: true, price: true, writer: true } } },
      },
    },
  });

  if (!transaction) {
    throw new NotFoundError("Transaction", id);
  }

  res.json({ status: true, data: transaction });
});

export const getTransactionStatistics = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const [totalTransactions, avgTransactionValue, genreStats] = await Promise.all([
    prisma.order.count(),
    prisma.orderItem.aggregate({
      _avg: { quantity: true },
      _sum: { quantity: true },
    }),
    prisma.$queryRaw<any[]>`
      SELECT g.name AS genre, COUNT(oi.id) AS total_sold, COUNT(DISTINCT b.id) AS unique_books
      FROM order_items oi
      JOIN books b ON oi.book_id = b.id
      JOIN genres g ON b.genre_id = g.id
      WHERE b.deleted_at IS NULL
      GROUP BY g.id, g.name
      ORDER BY total_sold DESC;
    `,
  ]);

  if (!Array.isArray(genreStats) || genreStats.length === 0) {
    return res.json({
      status: true,
      data: {
        totalTransactions,
        totalItemsSold: avgTransactionValue._sum?.quantity || 0,
        averageQuantityPerTransaction: avgTransactionValue._avg?.quantity || 0,
        genreMostSold: null,
        genreLeastSold: null,
        allGenres: [],
      },
    });
  }

  res.json({
    status: true,
    data: {
      totalTransactions,
      totalItemsSold: avgTransactionValue._sum?.quantity || 0,
      averageQuantityPerTransaction: avgTransactionValue._avg?.quantity || 0,
      genreMostSold: genreStats[0] || null,
      genreLeastSold: genreStats[genreStats.length - 1] || null,
      allGenres: genreStats,
    },
  });
});
