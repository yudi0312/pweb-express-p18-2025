"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTransactionStatistics = exports.getTransactionDetail = exports.getAllTransactions = exports.createTransaction = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const errorHandler_1 = require("../utils/errorHandler");
const errorMiddleware_1 = require("../middleware/errorMiddleware");
exports.createTransaction = (0, errorMiddleware_1.catchAsync)(async (req, res, next) => {
    const userId = req.user?.id;
    const { items } = req.body;
    // Authentication validation
    if (!userId) {
        throw new errorHandler_1.AuthenticationError("User authentication required");
    }
    // Validation
    if (!items) {
        throw new errorHandler_1.ValidationError("Items array is required", "items");
    }
    if (!Array.isArray(items)) {
        throw new errorHandler_1.ValidationError("Items must be an array", "items");
    }
    if (items.length === 0) {
        throw new errorHandler_1.ValidationError("Items array cannot be empty", "items");
    }
    // Validate each item
    items.forEach((item, index) => {
        if (!item.book_id) {
            throw new errorHandler_1.ValidationError(`Item ${index + 1}: book_id is required`, "book_id");
        }
        if (!item.quantity || item.quantity < 1) {
            throw new errorHandler_1.ValidationError(`Item ${index + 1}: quantity must be at least 1`, "quantity");
        }
        // Validate quantity is integer (not float)
        if (!Number.isInteger(item.quantity)) {
            throw new errorHandler_1.ValidationError(`Item ${index + 1}: quantity must be an integer, not a decimal number`, "quantity");
        }
    });
    // Verify user exists
    const user = await prisma_1.default.user.findUnique({ where: { id: userId } });
    if (!user) {
        throw new errorHandler_1.NotFoundError("User", userId);
    }
    // Create transaction with atomic operations
    const transaction = await prisma_1.default.$transaction(async (tx) => {
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
                throw new errorHandler_1.NotFoundError("Book", item.book_id);
            }
            if (book.deleted_at) {
                throw new errorHandler_1.BusinessLogicError(`Book "${book.title}" has been deleted and cannot be purchased`);
            }
            // Check stock
            if (book.stock_quantity < item.quantity) {
                throw new errorHandler_1.BusinessLogicError(`Insufficient stock for "${book.title}". Available: ${book.stock_quantity}, Requested: ${item.quantity}`);
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
exports.getAllTransactions = (0, errorMiddleware_1.catchAsync)(async (req, res, next) => {
    const transactions = await prisma_1.default.order.findMany({
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
exports.getTransactionDetail = (0, errorMiddleware_1.catchAsync)(async (req, res, next) => {
    const id = req.params.transaction_id;
    if (!id) {
        throw new errorHandler_1.ValidationError("Transaction ID is required", "transaction_id");
    }
    const transaction = await prisma_1.default.order.findUnique({
        where: { id },
        include: {
            user: { select: { id: true, email: true, username: true } },
            items: {
                include: { book: { select: { id: true, title: true, price: true, writer: true } } },
            },
        },
    });
    if (!transaction) {
        throw new errorHandler_1.NotFoundError("Transaction", id);
    }
    res.json({ status: true, data: transaction });
});
exports.getTransactionStatistics = (0, errorMiddleware_1.catchAsync)(async (req, res, next) => {
    const [totalTransactions, avgTransactionValue, genreStats] = await Promise.all([
        prisma_1.default.order.count(),
        prisma_1.default.orderItem.aggregate({
            _avg: { quantity: true },
            _sum: { quantity: true },
        }),
        prisma_1.default.$queryRaw `
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
