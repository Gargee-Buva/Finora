import { Router } from "express";
import {
  createTransactionController,
  createMultipleTransactionsController,
  getAllTransactionController,
  getTransactionByIdController,
  duplicateTransactionController,
  updateTransactionController,
  deleteTransactionController,
  bulkDeleteTransactionController,
  bulkTransactionController, // alias for backward compatibility (bulk insert)
  scanReceiptController,
} from "../controllers/transaction.controller.js";
import { passportAuthenticateJwt } from "../config/passport.config.js";
import { upload } from "../config/cloudinary.config.js";


const transactionRoutes = Router();

// 🔐 protect routes with JWT
transactionRoutes.post("/create", passportAuthenticateJwt, createTransactionController);

transactionRoutes.post(
  "/scan-receipt",
  upload.single("receipt"),
  scanReceiptController
);

// ✅ bulk insert (preferred)
transactionRoutes.post("/bulk", passportAuthenticateJwt, createMultipleTransactionsController);

// ✅ bulk insert alias (backwards compatibility)
//transactionRoutes.post("/bulk-transaction", passportAuthenticateJwt, bulkTransactionController);

// ✅ bulk delete (use POST to avoid issues with DELETE + body)
transactionRoutes.post("/bulk-delete", passportAuthenticateJwt, bulkDeleteTransactionController);

// fetch all transactions
transactionRoutes.get("/", passportAuthenticateJwt, getAllTransactionController);
transactionRoutes.get("/all", passportAuthenticateJwt, getAllTransactionController);

// duplicate transaction
transactionRoutes.put("/duplicate/:id", passportAuthenticateJwt, duplicateTransactionController);

// get transaction by id (param route placed after static routes)
transactionRoutes.get("/:id", passportAuthenticateJwt, getTransactionByIdController);

// update transaction
transactionRoutes.put("/update/:id", passportAuthenticateJwt, updateTransactionController);

// delete single transaction
transactionRoutes.delete("/delete/:id", passportAuthenticateJwt, deleteTransactionController);

export default transactionRoutes;
