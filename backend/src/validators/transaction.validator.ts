import { z } from "zod";
import {
  PaymentMethodEnum,
  RecurringIntervalEnum,
  TransactionTypeEnum,
} from "../models/transaction.model.js";

/** simple id schema */
export const transactionSchema = z.string().trim().min(1);

/** base transaction schema */
export const baseTransactionSchema = z.object({
  title: z.string().min(1, "Title is required"),

  description: z.string().optional(),

  /**
   * Transaction Type
   * Accepts: INCOME, income, Expense, EXPENSE
   * Stores: "Income" | "Expense"
   */
  type: z
    .string()
    .transform((v) => v.trim().toLowerCase())
    .refine((v) => ["INCOME", "EXPENSE", "income", "expense"].includes(v), {
      message: "Transaction type must be either Income or Expense",
    })
    .transform((v) =>
      v === "income"
        ? TransactionTypeEnum.INCOME
        : TransactionTypeEnum.EXPENSE
    ),

  /**
   * Amount
   * Accepts string or number
   */
  amount: z.coerce
    .number()
    .positive("Amount must be positive")
    .max(1_000_000_000, "Amount too large"),

  category: z.string().min(1, "Category is required"),

  /**
   * Date
   */
    date: z
  .union([z.string(), z.date()])
  .transform((val) => {
    const d = new Date(val);
    if (isNaN(d.getTime())) {
      throw new Error("Invalid date");
    }
    return d;
  }),


  /**
   * Recurring Interval
   * Accepts: DAILY, daily, Monthly, MONTHLY
   * Stores: daily | weekly | monthly | yearly
   */
  recurringInterval: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v ? v.trim().toLowerCase() : null))
    .refine(
      (v) =>
        v === null ||
        ["daily", "weekly", "monthly", "yearly"].includes(v),
      {
        message:
          "Recurring interval must be daily, weekly, monthly, or yearly",
      }
    )
    .transform((v) => (v ? (v as RecurringIntervalEnum) : null)),

  receiptUrl: z.string().optional(),

  /**
   * Payment Method
   * Accepts: CASH, cash, Card, BANK_TRANSFER
   * Stores: Cash | Card | UPI | Bank Transfer
   */
  paymentMethod: z
    .string()
    .transform((v) => v.toLowerCase())
    .refine(
      (v) =>
        ["cash", "card", "upi", "bank transfer", "credit/debit card"].includes(v),
      {
        message: "Payment method must be Cash, Card, UPI, or Bank Transfer",
      }
    )
    .transform((v) => {
      switch (v) {
        case "cash":
          return PaymentMethodEnum.CASH;
        case "card":
          return PaymentMethodEnum.CARD;
        case "upi":
          return PaymentMethodEnum.UPI;
        case "bank transfer":
          return PaymentMethodEnum.BANK_TRANSFER;
        case "credit/debit card":
          return PaymentMethodEnum.CARD;
        default:
          return PaymentMethodEnum.CASH;
      }
    }),
});

/** create */
export const createTransactionSchema = baseTransactionSchema;

/** update */
export const updateTransactionSchema = baseTransactionSchema.partial();

/** bulk delete */
export const bulkDeleteransactionSchema = z.object({
  transactionIds: z
    .array(z.string().trim().min(1))
    .min(1, "At least one Transaction ID is required"),
});

/** bulk create */
export const createTransactionsArraySchema = z.array(baseTransactionSchema);

/** types */
export type CreateTransactionType = z.infer<
  typeof createTransactionSchema
>;
export type UpdateTransactionType = z.infer<
  typeof updateTransactionSchema
>;
export type CreateTransactionsArrayType = z.infer<
  typeof createTransactionsArraySchema
>;
export type BulkDeleteTransactionType = z.infer<
  typeof bulkDeleteransactionSchema
>;
