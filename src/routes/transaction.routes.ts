import { Router } from "express";
import {
  createTransaction,
  getAllTransactions,
  getTransactionDetail,
  getTransactionStatistics,
} from "../controllers/transaction.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/", authenticate, createTransaction);
router.get("/", getAllTransactions);
router.get("/:transaction_id", getTransactionDetail);
router.get("/statistics/all", getTransactionStatistics);

export default router;
