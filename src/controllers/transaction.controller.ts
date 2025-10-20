import { Request, Response } from "express";
import prisma from "../prisma";

/**
 * CREATE TRANSACTION
 * POST /transactions
 * Body: { items: [ { book_id, quantity } ] }
 */
export const createTransaction = async (req: Request, res: Response) => {
  const userId = (req as any).user.id; // ambil user dari JWT middleware
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ status: false, message: "Items are required" });
  }

  try {
    const transaction = await prisma.$transaction(async (tx) => {
      // 1️⃣ buat order
      const order = await tx.order.create({
        data: {
          user_id: userId,
        },
      });

      // 2️⃣ tambahkan semua order_items
      for (const item of items) {
        const book = await tx.book.findUnique({ where: { id: item.book_id } });
        if (!book) throw new Error(`Book not found: ${item.book_id}`);

        if (book.stock_quantity < item.quantity) {
          throw new Error(`Insufficient stock for ${book.title}`);
        }

        // kurangi stok
        await tx.book.update({
          where: { id: item.book_id },
          data: { stock_quantity: book.stock_quantity - item.quantity },
        });

        // catat item pembelian
        await tx.orderItem.create({
          data: {
            order_id: order.id,
            book_id: item.book_id,
            quantity: item.quantity,
          },
        });
      }

      return order;
    });

    res.status(201).json({ status: true, message: "Transaction created", data: transaction });
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message || "Transaction failed" });
  }
};

/**
 * GET ALL TRANSACTIONS
 * GET /transactions
 */
export const getAllTransactions = async (_: Request, res: Response) => {
  try {
    const transactions = await prisma.order.findMany({
      include: {
        user: true,
        order_items: {
          include: {
            book: true,
          },
        },
      },
    });

    res.json({ status: true, data: transactions });
  } catch (err) {
    res.status(500).json({ status: false, message: "Failed to fetch transactions" });
  }
};

/**
 * GET TRANSACTION DETAIL
 * GET /transactions/:transaction_id
 */
export const getTransactionDetail = async (req: Request, res: Response) => {
  try {
    const id = req.params.transaction_id;
    const transaction = await prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        order_items: {
          include: { book: true },
        },
      },
    });

    if (!transaction) {
      return res.status(404).json({ status: false, message: "Transaction not found" });
    }

    res.json({ status: true, data: transaction });
  } catch (err) {
    res.status(500).json({ status: false, message: "Failed to get transaction detail" });
  }
};

/**
 * GET TRANSACTION STATISTICS
 * GET /transactions/statistics
 */
export const getTransactionStatistics = async (_: Request, res: Response) => {
  try {
    const [totalTransactions, avgTransactionValue, genreStats] = await Promise.all([
      prisma.order.count(),
      prisma.orderItem.aggregate({
        _avg: { quantity: true },
      }),
      prisma.$queryRaw`
        SELECT g.name AS genre, COUNT(oi.id) AS total_sold
        FROM order_items oi
        JOIN books b ON oi.book_id = b.id
        JOIN genres g ON b.genre_id = g.id
        GROUP BY g.id
        ORDER BY total_sold DESC;
      `,
    ]);

    const genreMost = genreStats[0];
    const genreLeast = genreStats[genreStats.length - 1];

    res.json({
      status: true,
      data: {
        totalTransactions,
        averageQuantityPerTransaction: avgTransactionValue._avg.quantity || 0,
        genreMostSold: genreMost || null,
        genreLeastSold: genreLeast || null,
      },
    });
  } catch (err) {
    res.status(500).json({ status: false, message: "Failed to get statistics" });
  }
};
