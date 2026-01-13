import type { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware.js";
import { HTTPSTATUS } from "../config/http.config.js";
import { z } from "zod";
import {
  createTransactionSchema,
  createTransactionsArraySchema,
  transactionSchema,
  updateTransactionSchema,
  bulkDeleteransactionSchema,
} from "../validators/transaction.validator.js";
import {
  createTransactionService,
  getAllTransactionService,
  getTransactionByIdService,
  duplicateTransactionService,
  updateTransactionService,
  deleteTransactionService,
  bulkDeleteTransactionService,
  bulkTransactionService,
  scanReceiptService,
} from "../services/transaction.service.js";
import type { TransactionTypeEnum } from "../models/transaction.model.js";

/** helper to safely extract userId from req.user */
const extractUserId = (req: Request) => {
  const u = (req as any).user;
  return u?._id ?? u?.userId ?? u?.id ?? undefined;
};

/**
 * Create a single transaction
 */
export const createTransactionController = asyncHandler(
  async (req: Request, res: Response) => {
    const body = createTransactionSchema.parse(req.body);

    const userId = extractUserId(req) || (req.body && (req.body as any).userId);

    if (!userId) {
      return res
        .status(HTTPSTATUS.UNAUTHORIZED)
        .json({ message: "Unauthorized: missing user id" });
    }

    const transaction = await createTransactionService(body, userId);

    return res.status(HTTPSTATUS.CREATED).json({
      message: "Transaction created successfully",
      transaction,
    });
  }
);

/**
 * Create multiple transactions (bulk insert)
 */
// export const createMultipleTransactionsController = asyncHandler(
//   async (req: Request, res: Response) => {
//     const userId = extractUserId(req);

//     if (!userId) {
//       return res
//         .status(HTTPSTATUS.UNAUTHORIZED)
//         .json({ message: "Unauthorized: missing user id" });
//     }

//     // Parse as array of transactions
//     const records = createTransactionsArraySchema.parse(req.body);

    
//     const transactions = await Promise.all(
//       records.map((record) => createTransactionService(record, userId))
//     );

 

//     return res.status(HTTPSTATUS.CREATED).json({
//       message: "Bulk transaction inserted successfully",
//       transactions,
//     });
//   }
// );

export const createMultipleTransactionsController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 1️⃣ Validate entire CSV first
    const { transactions: records } = z
    .object({
    transactions: createTransactionsArraySchema,
   })
   .parse(req.body);


    // 2️⃣ Only insert AFTER validation succeeds
    const transactions = await bulkTransactionService(userId, records);

    return res.status(201).json({
      message: "Bulk transactions imported successfully",
      insertedCount: transactions.insertedCount,
    });
  }
);


/**
 * Get all transactions (with filters + pagination)
 */
export const getAllTransactionController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = extractUserId(req);

    if (!userId) {
      return res
        .status(HTTPSTATUS.UNAUTHORIZED)
        .json({ message: "Unauthorized: missing user id" });
    }

    const filters: {
      keyword?: string;
      type?: keyof typeof TransactionTypeEnum;
      recurringStatus?: "RECURRING" | "NON_RECURRING";
    } = {};

    if (req.query.keyword) {
      filters.keyword = String(req.query.keyword);
    }

    // ✅ FIX IS HERE
    if (req.query.type) {
      filters.type = String(req.query.type).toUpperCase() as keyof typeof TransactionTypeEnum;
    }

    if (req.query.recurringStatus) {
      let status = String(req.query.recurringStatus);
      if (status === "NON-RECURRING") status = "NON_RECURRING";
      filters.recurringStatus = status as "RECURRING" | "NON_RECURRING";
    }

    const pagination = {
      pageSize: parseInt(String(req.query.pageSize || "20")) || 20,
      pageNumber: parseInt(String(req.query.page || req.query.pageNumber || "1")) || 1,
    };

    const result = await getAllTransactionService(userId, filters, pagination);

    return res.status(HTTPSTATUS.OK).json({
      message: "Transaction fetched successfully",
      result,
    });
  }
);


export const getTransactionByIdController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) {
      return res
        .status(HTTPSTATUS.UNAUTHORIZED)
        .json({ message: "Unauthorized: missing user id" });
    }

    const transactionId = transactionSchema.parse(req.params.id);

    const transaction = await getTransactionByIdService(userId, transactionId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Transaction fetched successfully",
      transaction,
    });
  }
);

export const duplicateTransactionController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) {
      return res
        .status(HTTPSTATUS.UNAUTHORIZED)
        .json({ message: "Unauthorized: missing user id" });
    }

    const transactionId = transactionSchema.parse(req.params.id);

    const duplicated = await duplicateTransactionService(userId, transactionId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Transaction duplicated successfully",
      duplicated,
    });
  }
);

export const updateTransactionController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) {
      return res
        .status(HTTPSTATUS.UNAUTHORIZED)
        .json({ message: "Unauthorized: missing user id" });
    }

    const transactionId = transactionSchema.parse(req.params.id);
    const body = updateTransactionSchema.parse(req.body);

    await updateTransactionService(userId, transactionId, body);

    return res.status(HTTPSTATUS.OK).json({
      message: "Transaction updated successfully",
    });
  }
);

export const deleteTransactionController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) {
      return res
        .status(HTTPSTATUS.UNAUTHORIZED)
        .json({ message: "Unauthorized: missing user id" });
    }

    const transactionId = transactionSchema.parse(req.params.id);
    

    await deleteTransactionService(userId, transactionId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Transaction deleted successfully",
    });
  }
);


export const bulkDeleteTransactionController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) {
      return res
        .status(HTTPSTATUS.UNAUTHORIZED)
        .json({ message: "Unauthorized: missing user id" });
    }

    const { transactionIds } = bulkDeleteransactionSchema.parse(req.body);
    

    const result = await bulkDeleteTransactionService(userId, transactionIds);

    return res.status(HTTPSTATUS.OK).json({
      message: "Transaction deleted successfully",
      ...result,
    });
  }
);

export const bulkTransactionController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = extractUserId(req);

    if (!userId) {
      return res
        .status(HTTPSTATUS.UNAUTHORIZED)
        .json({ message: "Unauthorized: missing user id" });
    }

    // Parse as array of transactions (same as createMultipleTransactionsController)
    const { transactions: records } = z
    .object({
        transactions: createTransactionsArraySchema,
      })
      .parse(req.body);
    // Use the same service as the main bulk insert endpoint
    const transactions = await Promise.all(
      records.map((record) => createTransactionService(record, userId))
    );

    return res.status(HTTPSTATUS.CREATED).json({
      message: "Bulk transaction inserted successfully",
      transactions,
    });
  }
);

export const scanReceiptController = asyncHandler(
  async (req: Request, res: Response) => {
    const file = req?.file;
    
    console.log("Received file:", file ? {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path
    } : "No file");

    const result = await scanReceiptService(file);

    return res.status(HTTPSTATUS.OK).json({
      message: "Receipt scanned successfully",
      data: result,
    });
  }
);
