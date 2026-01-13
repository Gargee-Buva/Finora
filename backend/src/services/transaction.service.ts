import axios from "axios";
import fs from "fs";
import TransactionModel, { TransactionTypeEnum } from "../models/transaction.model.js";
import { BadRequestException, NotFoundException } from "../utils/app-error.js";
import { calculateNextOccurrence } from "../utils/helper.js";
import type {
  CreateTransactionType,
  UpdateTransactionType,
} from "../validators/transaction.validator.js";
import { genAI, candidateModels } from "../config/google-ai.config.js";
import { receiptPrompt } from "../utils/prompt.js";
import Env from "../config/env.config.js";

/**
 * Helpers
 */
async function listRemoteModelsForDebug() {
  try {
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${Env.GEMINI_API_KEY}`;
    const res = await axios.get(url, { timeout: 15000 });
    return res.data;
  } catch (err: any) {
    console.error("Failed to list remote models (debug):", err?.response?.data ?? err?.message ?? err);
    return null;
  }
}

/**
 * Create single transaction
 */
export const createTransactionService = async (
  body: CreateTransactionType,
  userId: string
) => {
  let nextRecurringDate: Date | undefined;
  const currentDate = new Date();
  const isRecurring = (body as any).isRecurring || false;

  if (isRecurring && body.recurringInterval) {
    const calculatedDate = calculateNextOccurrence(
      body.date,
      body.recurringInterval
    );

    nextRecurringDate =
      calculatedDate < currentDate
        ? calculateNextOccurrence(currentDate, body.recurringInterval)
        : calculatedDate;
  }

  const transaction = await TransactionModel.create({
    ...body,
    userId,
    category: body.category,
    amount: Number(body.amount),
    isRecurring,
    recurringInterval: body.recurringInterval || null,
    nextRecurringDate,
    lastProcessed: null,
  });

  return transaction;
};

/**
 * Get all transactions
 */
export const getAllTransactionService = async (
  userId: string,
  filters: {
    keyword?: string;
    type?: keyof typeof TransactionTypeEnum;
    recurringStatus?: "RECURRING" | "NON_RECURRING";
  },
  pagination: {
    pageSize: number;
    pageNumber: number;
  }
) => {
  const { keyword, type, recurringStatus } = filters;

  const filterConditions: Record<string, any> = { userId };

  if (keyword) {
    filterConditions.$or = [
      { title: { $regex: keyword, $options: "i" } },
      { category: { $regex: keyword, $options: "i" } },
    ];
  }

  if (type) {
  filterConditions.type =
    type === "INCOME"
      ? TransactionTypeEnum.INCOME
      : TransactionTypeEnum.EXPENSE;
}


  if (recurringStatus) {
    filterConditions.isRecurring = recurringStatus === "RECURRING";
  }

  const { pageSize, pageNumber } = pagination;
  const skip = (pageNumber - 1) * pageSize;

  const [transactions, totalCount] = await Promise.all([
    TransactionModel.find(filterConditions)
      .skip(skip)
      .limit(pageSize)
      .sort({ createdAt: -1 }),
    TransactionModel.countDocuments(filterConditions),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    transactions,
    pagination: {
      pageSize,
      pageNumber,
      totalCount,
      totalPages,
      skip,
    },
  };
};

/**
 * Other CRUD helpers (unchanged)
 */
export const getTransactionByIdService = async (userId: string, transactionId: string) => {
  const transaction = await TransactionModel.findOne({
    _id: transactionId,
    userId,
  });
  if (!transaction) throw new NotFoundException("Transaction not found");
  return transaction;
};

export const duplicateTransactionService = async (userId: string, transactionId: string) => {
  const transaction = await TransactionModel.findOne({
    _id: transactionId,
    userId,
  });
  if (!transaction) throw new NotFoundException("Transaction not found");

  const duplicated = await TransactionModel.create({
    ...transaction.toObject(),
    _id: undefined,
    title: `Duplicate - ${transaction.title}`,
    description: transaction.description
      ? `${transaction.description} (Duplicate)`
      : "Duplicated transaction",
    isRecurring: false,
    recurringInterval: undefined,
    nextRecurringDate: undefined,
    createdAt: undefined,
    updatedAt: undefined,
  });

  return duplicated;
};

export const updateTransactionService = async (
  userId: string,
  transactionId: string,
  body: UpdateTransactionType
) => {
  const existingTransaction = await TransactionModel.findOne({
    _id: transactionId,
    userId,
  });
  if (!existingTransaction) throw new NotFoundException("Transaction not found");

  const now = new Date();
  const isRecurring = body.isRecurring ?? existingTransaction.isRecurring;

  const date =
    body.date !== undefined ? new Date(body.date) : existingTransaction.date;

  const recurringInterval =
    body.recurringInterval || existingTransaction.recurringInterval;

  let nextRecurringDate: Date | undefined;

  if (isRecurring && recurringInterval) {
    const calculatedDate = calculateNextOccurrence(date, recurringInterval);

    nextRecurringDate =
      calculatedDate < now
        ? calculateNextOccurrence(now, recurringInterval)
        : calculatedDate;
  }

  existingTransaction.set({
    ...(body.title && { title: body.title }),
    ...(body.description && { description: body.description }),
    ...(body.category && { category: body.category }),
    ...(body.type && { type: body.type }),
    ...(body.paymentMethod && { paymentMethod: body.paymentMethod }),
    ...(body.amount !== undefined && { amount: Number(body.amount) }),
    date,
    isRecurring,
    recurringInterval,
    nextRecurringDate,
  });

  await existingTransaction.save();
  return;
};

export const deleteTransactionService = async (userId: string, transactionId: string) => {
  const deleted = await TransactionModel.findByIdAndDelete({
    _id: transactionId,
    userId,
  } as any);
  if (!deleted) throw new NotFoundException("Transaction not found");
  return;
};

export const bulkDeleteTransactionService = async (
  userId: string,
  transactionIds: string[]
) => {
  const result = await TransactionModel.deleteMany({
    _id: { $in: transactionIds },
    userId,
  });

  if (result.deletedCount === 0) throw new NotFoundException("No transactions found");

  return {
    success: true,
    deletedCount: result.deletedCount,
  };
};

export const bulkTransactionService = async (
  userId: string,
  transactions: CreateTransactionType[]
) => {
  try {
    const bulkOps = transactions.map((tx) => ({
      insertOne: {
        document: {
          ...tx,
          userId,
          isRecurring: false,
          nextRecurringDate: null,
          recurringInterval: null,
          lastProcessed: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    }));

    const result = await TransactionModel.bulkWrite(bulkOps, { ordered: true });

    return {
      insertedCount: result.insertedCount,
      success: true,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * scanReceiptService
 * - supports: multer memory buffer, disk path, or remote Cloudinary URL
 * - tries candidateModels in order and logs detailed errors
 * - if all fail attempts to list remote models via REST for debugging
 */
export const scanReceiptService = async (
  file: Express.Multer.File | undefined
) => {
  if (!file) throw new BadRequestException("No file uploaded");

  try {
    // Get a Buffer for the uploaded file (supports memoryStorage, disk path, and remote URL)
    let fileBuffer: Buffer;
    if ((file as any).buffer) {
      // multer.memoryStorage()
      fileBuffer = (file as any).buffer;
    } else if (typeof file.path === "string" && file.path.startsWith("http")) {
      // remote URL (Cloudinary)
      console.log("Downloading remote file from:", file.path);
      const resp = await axios.get(file.path, { responseType: "arraybuffer", timeout: 20000 });
      fileBuffer = Buffer.from(resp.data);
    } else if (typeof file.path === "string" && fs.existsSync(file.path)) {
      // local disk path used by multer.diskStorage()
      fileBuffer = fs.readFileSync(file.path);
    } else {
      throw new BadRequestException("Failed to read uploaded file (check multer config and file path)");
    }

    const base64String = fileBuffer.toString("base64");
    if (!base64String) throw new BadRequestException("Could not process file");

    console.log("Calling Google Generative AI. API key present:", !!Env.GEMINI_API_KEY);

    // Try candidate models in order
    let lastError: any = null;
    let result: any = null;
    let usedModel: string | null = null;

    for (const modelName of candidateModels) {
      try {
        console.log("Trying model:", modelName);
        const model = genAI.getGenerativeModel({ model: modelName });

        result = await model.generateContent([
          { text: receiptPrompt },
          {
            inlineData: {
              data: base64String,
              mimeType: file.mimetype,
            },
          },
        ]);

        usedModel = modelName;
        console.log("Model succeeded:", modelName);
        break; // success
      } catch (err: any) {
        lastError = err;
        console.error(`Model ${modelName} failed:`, err?.message ?? err);

        // log SDK response body if available
        if (err?.response?.data) {
          console.error("Google response body:", JSON.stringify(err.response.data, null, 2));
        }

        // If non-retriable client error (4xx except 429), abort early
        const status = err?.status ?? err?.response?.status;
        if (status && status >= 400 && status < 500 && status !== 429) {
          console.log("Non-retriable client error from model; aborting attempts.");
          break;
        }

        // else try next model
      }
    }

    if (!result) {
      console.error("All models failed. Last error:", lastError?.message ?? lastError);
      const remoteModels = await listRemoteModelsForDebug();
      if (remoteModels) {
        console.error("Remote models list:", JSON.stringify(remoteModels, null, 2));
      }
      return {
        error:
          "Receipt scanning service unavailable (AI models failed). See server logs for details.",
        details: process.env.NODE_ENV !== "production" ? (lastError?.message ?? String(lastError)) : undefined,
      };
    }

    // Parse AI response text
    const rawText = typeof result.response?.text === "function" ? result.response.text() : result.response?.text ?? result.text ?? null;
    console.log("AI raw response (truncated):", rawText ? String(rawText).slice(0, 1000) : rawText);

    const cleanedText = rawText ? String(rawText).replace(/```(?:json)?\n?/g, "").trim() : null;
    if (!cleanedText) {
      return { error: "Could not read receipt content" };
    }

    let data: any;
    try {
      data = JSON.parse(cleanedText);
    } catch (parseErr) {
      console.error("Failed to parse AI JSON:", parseErr, "raw:", cleanedText.slice(0, 1000));
      return { error: "Could not parse receipt data from AI" };
    }

    if (!data.amount || !data.date) {
      return { error: "Receipt missing required information" };
    }

    return {
      title: data.title ?? "Receipt",
      amount: data.amount,
      date: data.date,
      description: data.description,
      category: data.category,
      paymentMethod: data.paymentMethod,
      type: data.type,
      receiptUrl: file.path,
      model: usedModel,
    };
  } catch (error: any) {
    console.error("Receipt scanning error (final):", error);
    return {
      error: "Receipt scanning service unavailable",
      details: process.env.NODE_ENV !== "production" ? (error?.message ?? String(error)) : undefined,
    };
  }
};

