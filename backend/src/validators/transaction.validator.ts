import { z } from "zod";
import {
  PaymentMethodEnum,
  RecurringIntervalEnum,
  TransactionTypeEnum,
} from "../models/transaction.model.js";

export const transactionSchema = z.string().trim().min(1);

export const baseTransactionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description : z.string().optional(),

  type: z.enum([TransactionTypeEnum.INCOME, TransactionTypeEnum.EXPENSE], {
    errorMap: () => ({
      message: "Transaction type must either Income or Expense",
    }),
  }),

  amount: z.number().positive("Amount must be positive").min(1),

  category: z.string().min(1, "Category is required"),

  date: z
    .union([z.string().datetime({ message: "Invalid date string" }), z.date()])
    .transform((val) => new Date(val)),

  
  isRecurring: z.boolean().default(false),

  recurringInterval: z
    // .enum([
    //   RecurringIntervalEnum.DAILY,
    //   RecurringIntervalEnum.WEEKLY,
    //   RecurringIntervalEnum.MONTHLY,
    //   RecurringIntervalEnum.YEARLY,
    // ])
    .nativeEnum(RecurringIntervalEnum)
    .nullable()
    .optional(),

  receiptUrl: z.string().optional(),

  paymentMethod: z
    .nativeEnum(PaymentMethodEnum)
    .default(PaymentMethodEnum.CASH),
});

export const createTransactionSchema = baseTransactionSchema;
export const updateTransactionSchema = baseTransactionSchema.partial();

export const bulkDeleteransactionSchema = z.object({
  transactionIds: z
    .array(z.string().trim().min(1, "Transaction ID cannot be empty"))
    .min(1, "At least one Transaction ID is required"),
});

export const bulktransactionSchema = z.object({
  transactionIds: z
    .array(baseTransactionSchema)
    .min(1 , "At least one Transaction  is required")
    .max(300, "Cannot create more than 300 transactions at once")
    .refine(
      (txs) => txs.every((tx) => {
        const amount = Number(tx.amount);
        return !isNaN(amount) && amount > 0 && amount <= 1_000_000_000;
      }),
      {
        message: "Each transaction amount must be a positive number not exceeding 1,000,000,000",
      }
    )
});



// ✅ new: array schema for bulk insert
export const createTransactionsArraySchema = z.array(baseTransactionSchema);

export type CreateTransactionType = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionType = z.infer<typeof updateTransactionSchema>;
export type CreateTransactionsArrayType = z.infer<
  typeof createTransactionsArraySchema
>;

export type BulkDeleteTransactionType = z.infer<
  typeof bulkDeleteransactionSchema
>;
