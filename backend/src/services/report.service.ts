import mongoose from "mongoose";
import ReportModel from "../models/report.model.js";
import ReportSettingModel from "../models/report-setting-model.js";
import TransactionModel, { TransactionTypeEnum } from "../models/transaction.model.js";
import UserModel from "../models/user.model.js";
import { calculateNextReportDate } from "../utils/helper.js";
import { NotFoundException } from "../utils/app-error.js";
import type { UpdateReportSettingType } from "../validators/report.validator.js";
import { convertToRupees , formatCurrency} from "../utils/format-currency.js";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { reportInsightPrompt } from "../utils/prompt.js";
import { genAI, defaultModel as genAIModel, getModel } from "../config/google-ai.config.js";

function escapeForRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Normalize currency to appear AFTER the number with no space.
 * Examples:
 *   "₹18.98" -> "18.98₹"
 *   "$1,234.50" -> "1,234.50₹" (if desiredSymbol is "₹")
 */
function normalizeCurrencyPostfix(text: string, desiredSymbol = "₹"): string {
  if (!text) return text;
  let out = String(text);

  // Replace dollar/US labels with desired symbol to standardize
  out = out.replace(/\$/g, desiredSymbol).replace(/\bUSD\b/g, desiredSymbol);

  const sym = escapeForRegex(desiredSymbol);

  // Pattern: symbol before number, possibly whitespace: ₹ 12,345.67 or ₹12.34
  out = out.replace(new RegExp(`${sym}\\s*([\\d,]+(?:\\.\\d+)?)`, "g"), (_m, num) => `${num}${desiredSymbol}`);

  // Pattern: symbol before parenthesis e.g. ₹(12.34) -> (12.34)₹
  out = out.replace(new RegExp(`${sym}\\s*\\(\\s*([\\d,]+(?:\\.\\d+)?)\\s*\\)`, "g"), (_m, num) => `(${num})${desiredSymbol}`);

  // Pattern: number followed by space then symbol -> remove space
  out = out.replace(new RegExp(`([\\d,]+(?:\\.\\d+)?)\\s+${sym}`, "g"), (_m, num) => `${num}${desiredSymbol}`);

  return out;
}

/**
 * Format numeric rupee amount as "1,234.56₹" (postfix)
 * - amount is a number in rupees (not paise)
 */
function formatCurrencyPostfix(amount: number, symbol = "₹", locale = "en-IN"): string {
  const value = Number.isFinite(amount) ? amount : 0;
  const formattedNumber = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${formattedNumber}${symbol}`;
}

export const getAllReportsService = async (
  userId: string,
  pagination: {
    pageSize: number;
    pageNumber: number;
  }
) => {
  const query: Record<string, any> = { userId };

  const { pageSize, pageNumber } = pagination;
  const skip = (pageNumber - 1) * pageSize;

  const [reports, totalCount] = await Promise.all([
    ReportModel.find(query).skip(skip).limit(pageSize).sort({ createdAt: -1 }),
    ReportModel.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    reports,
    pagination: {
      pageSize,
      pageNumber,
      totalCount,
      totalPages,
      skip,
    },
  };
};

export const updateReportSettingService = async (
  userId: string,
  body: UpdateReportSettingType
) => {
  const { isEnabled } = body;
  let nextReportDate: Date | null = null;

  // debug log
  console.log("updateReportSettingService called with userId:", userId, "body:", body);

  // try a few ways to find the report setting (string, ObjectId)
  let existingReportSetting = await ReportSettingModel.findOne({ userId }).exec();

  if (!existingReportSetting) {
    try {
      // attempt cast to ObjectId and search
      existingReportSetting = await ReportSettingModel.findOne({
        userId: new mongoose.Types.ObjectId(userId),
      }).exec();
    } catch (err: unknown) {
      // invalid ObjectId string - ignore and proceed (safe error handling)
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("Could not cast userId to ObjectId:", msg);
    }
  }

  // If still not found -> create it automatically (safe, idempotent)
  if (!existingReportSetting) {
    console.warn(`No ReportSetting found for userId=${userId}. Creating default ReportSetting.`);
    existingReportSetting = await ReportSettingModel.create({
      userId: new mongoose.Types.ObjectId(userId),
      frequency: "MONTHLY",
      isEnabled: isEnabled ?? true,
      nextReportDate: calculateNextReportDate(new Date()),//new Date(),
      lastSentDate: null,
    });
    
  }

  // Now update logic (calculating nextReportDate if enabling)
  if (isEnabled) {
    const currentNextReportDate = existingReportSetting.nextReportDate;
    const now = new Date();

    const referenceDate: Date = existingReportSetting.lastSentDate ?? now;
    if (!currentNextReportDate || currentNextReportDate <= now) {
      nextReportDate = calculateNextReportDate(referenceDate);
    } else {
      nextReportDate = currentNextReportDate;
    }
  }

  console.log(nextReportDate , "nextReportDate");
  // apply incoming body and computed nextReportDate
  existingReportSetting.set({
    ...body,
    nextReportDate,
  });

  await existingReportSetting.save();

  // return the updated document (controller can use it)
  return existingReportSetting;
};



export const generateReportService = async (
  userId: string,
  fromDate: Date,
  toDate: Date
) => {
  // Debug / dev logs — remove or turn into proper logger later
  console.log("generateReportService called with:", { userId, fromDate, toDate });

  // Build match condition. If userId is falsy, we *do not* match on userId
  // (useful for local testing). In production you should always pass a valid userId.
  const match: Record<string, any> = {
    date: { $gte: fromDate, $lte: toDate },
  };

  if (userId) {
    try {
      match.userId = new mongoose.Types.ObjectId(userId);
    } catch (err) {
      console.warn("Invalid userId passed to generateReportService, ignoring userId filter for debug:", userId);
      // keep match without userId so devs can test data existence
    }
  } else {
    console.warn("No userId provided to generateReportService - running query without user filter (DEV MODE).");
  }

  const results = await TransactionModel.aggregate([
    { $match: match },
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              totalIncome: {
                // sums stored 'amount' values (paise). We'll convert later.
                $sum: {
                  $cond: [{ $eq: ["$type", TransactionTypeEnum.INCOME] }, { $abs: "$amount" }, 0],
                },
              },
              totalExpenses: {
                $sum: {
                  $cond: [{ $eq: ["$type", TransactionTypeEnum.EXPENSE] }, { $abs: "$amount" }, 0],
                },
              },
            },
          },
        ],
        categories: [
          { $match: { type: TransactionTypeEnum.EXPENSE } },
          { $group: { _id: "$category", total: { $sum: { $abs: "$amount" } } } },
          { $sort: { total: -1 } },
          { $limit: 5 },
        ],
      },
    },
    {
      // Project and ensure default 0 values if summary array was empty
      $project: {
        totalIncome: { $ifNull: [{ $arrayElemAt: ["$summary.totalIncome", 0] }, 0] },
        totalExpenses: { $ifNull: [{ $arrayElemAt: ["$summary.totalExpenses", 0] }, 0] },
        categories: 1,
      },
    },
  ]);

  // If results is empty, create a deterministic default object
  const raw = (results && results[0]) || { totalIncome: 0, totalExpenses: 0, categories: [] };

  // Debug print to inspect aggregation output
  console.log("generateReportService aggregation raw result:", raw);

  const totalIncomeRaw: number = raw.totalIncome ?? 0; // raw values are in paise
  const totalExpensesRaw: number = raw.totalExpenses ?? 0;
  const categoriesRaw: Array<{ _id: string; total: number }> = raw.categories ?? [];

  // Convert categories into final shape and to rupees
  const byCategory = categoriesRaw.reduce((acc: any, { _id, total }: any) => {
    acc[_id] = {
      amount: convertToRupees(total), // convert paise to rupees
      percentage: totalExpensesRaw > 0 ? Math.round((total / totalExpensesRaw) * 100) : 0,
    };
    return acc;
  }, {} as Record<string, { amount: number; percentage: number }>);

  const availableBalanceRaw = totalIncomeRaw - totalExpensesRaw;
  const savingsRate = calculateSavingRate(totalIncomeRaw, totalExpensesRaw);

const periodLabel = `${formatInTimeZone(fromDate, "UTC", "MMMM d, yyyy")} - ${formatInTimeZone(toDate, "UTC", "MMMM d, yyyy")}`;
  
// Generate AI-powered insights
  const insights = await generateInsightsAI({ 
    totalIncome: totalIncomeRaw,
    totalExpenses: totalExpensesRaw,
    availableBalance: availableBalanceRaw,
    savingsRate,
    categories: byCategory,
    periodLabel,
  });

  return {
    period: periodLabel,
    summary: {
      income: convertToRupees(totalIncomeRaw),
      expenses: convertToRupees(totalExpensesRaw),
      balance: convertToRupees(availableBalanceRaw),
      savingsRate: Number(savingsRate.toFixed(1)),
      topCategories: Object.entries(byCategory).map(([name, cat]: any) => ({
        name,
        amount: cat.amount,
        percent: cat.percentage,
      })),
    },
    insights,
  };
};

/**
 * callWithRetries: call an async function with exponential backoff + jitter.
 * - retries only on transient errors (429, 500, 502, 503, 504)
 * - honors Retry-After header when available (if the caught error exposes it)
 */

async function callWithRetries<T>(
  fn: () => Promise<T>,
  opts: { maxRetries?: number; baseDelayMs?: number } = {}
): Promise<T> {
  const maxRetries = opts.maxRetries ?? 5;
  const baseDelayMs = opts.baseDelayMs ?? 500;

  function jitter(ms: number) {
    return Math.floor(Math.random() * ms);
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      // Try to detect HTTP status & headers if available
      const status = err?.response?.status ?? err?.status;
      const headers = err?.response?.headers ?? err?.headers ?? {};

      const isTransient =
        status === 429 || status === 500 || status === 502 || status === 503 || status === 504;

      // log error details for debugging
      console.warn(
        `callWithRetries: attempt ${attempt + 1} failed; status=${status}; attempt <= maxRetries? ${attempt < maxRetries}`,
        {
          message: err?.message,
          status,
          headers,
          name: err?.name,
          stack: err?.stack,
          body: err?.response?.data ?? err?.data ?? undefined,
        }
      );

      if (attempt >= maxRetries || !isTransient) {
        // no more retries or non-transient -> rethrow
        throw err;
      }

      // If server suggested Retry-After, honor it (could be seconds or http-date)
      const retryAfterRaw = headers["retry-after"] ?? headers["Retry-After"];
      if (retryAfterRaw) {
        const parsed = Number(retryAfterRaw);
        if (!Number.isNaN(parsed) && parsed > 0) {
          const wait = parsed * 1000 + jitter(500);
          await new Promise((r) => setTimeout(r, wait));
          continue;
        } else {
          // try to parse HTTP-date fallback
          const serverDate = Date.parse(String(retryAfterRaw));
          if (!Number.isNaN(serverDate)) {
            const wait = Math.max(1000, serverDate - Date.now()) + jitter(500);
            await new Promise((r) => setTimeout(r, wait));
            continue;
          }
        }
      }

      // Exponential backoff with jitter
      const delay = Math.min(30000, baseDelayMs * Math.pow(2, attempt)) + jitter(300);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  // Should not reach here
  throw new Error("callWithRetries exhausted all retries");
}



// AI-powered insights generator
async function generateInsightsAI({
  totalIncome,
  totalExpenses,
  availableBalance,
  savingsRate,
  categories,
  periodLabel,
  currencySymbol = "₹",
}: {
  totalIncome: number;
  totalExpenses: number;
  availableBalance: number;
  savingsRate: number;
  categories: Record<string, { amount: number; percentage: number }>;
  periodLabel: string;
  currencySymbol?: string;
}) {
  // Build prompt (string) using existing helper
  const prompt = reportInsightPrompt({
    totalIncome: convertToRupees(totalIncome),
    totalExpenses: convertToRupees(totalExpenses),
    availableBalance: convertToRupees(availableBalance),
    savingsRate: Number(savingsRate.toFixed(1)),
    categories,
    periodLabel,
  });

  // We will call the model via callWithRetries, catching transient failures
  try {
    const model = getModel(genAIModel) as any;

    // Use a wrapper to call whichever function the model exposes
    const invokeModel = async () => {
      if (typeof model.generateContent === "function") {
        return model.generateContent(prompt);
      } else if (typeof model.generateText === "function") {
        return model.generateText({ text: prompt });
      } else {
        const generateFn =
          model?.generateContent ?? model?.generate ?? model?.generateText ?? model?.createCompletion ?? model?.call;
        if (!generateFn) {
          throw new Error("No generate function found on model");
        }
        return generateFn.call(model, prompt);
      }
    };

    // Call with retries
    const result = await callWithRetries(() => invokeModel(), { maxRetries: 5, baseDelayMs: 500 });

    // Extract text from common response shapes
    let responseText = "";
    if (result?.response && typeof result.response.text === "function") {
      responseText = await result.response.text();
    } else if (Array.isArray(result?.output) && result.output[0]?.content?.[0]?.text) {
      responseText = result.output[0].content[0].text;
    } else if (typeof result?.text === "string") {
      responseText = result.text;
    } else if (typeof result?.outputText === "string") {
      responseText = result.outputText;
    } else {
      // last resort: stringify the raw result for visibility
      responseText = typeof result === "string" ? result : JSON.stringify(result);
    }

    const cleanedText = responseText?.replace(/```(?:json)?\n?/g, "").trim();

    if (!cleanedText) {
      // If model returned nothing meaningful, fall back
      console.info("generateInsightsAI: model returned empty response, using fallbackInsights.");
      return fallbackInsights({
        totalIncome,
        totalExpenses,
        availableBalance,
        savingsRate,
        categories,
        periodLabel,
      });
    }

    // Prefer JSON parse if model returned JSON; otherwise return array of text
    try {
      const data = JSON.parse(cleanedText);
      return data;
    } catch {
      return [cleanedText];
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("generateInsightsAI error (final):", msg, { err });

    // Deterministic fallback — always return helpful insights
    return fallbackInsights({
      totalIncome,
      totalExpenses,
      availableBalance,
      savingsRate,
      categories,
      periodLabel,
    });
  }
}


// Deterministic fallback generator (always returns array of strings)
function fallbackInsights({
  totalIncome,
  totalExpenses,
  availableBalance,
  savingsRate,
  categories,
  periodLabel,
}: {
  totalIncome: number;
  totalExpenses: number;
  availableBalance: number;
  savingsRate: number;
  categories: Record<string, { amount: number; percentage: number }>;
  periodLabel: string;
}) {
  const insights: string[] = [];
  insights.push(`Report for ${periodLabel}.`);
  insights.push(`Total income: ${convertToRupees(totalIncome)}. Total expenses: ${convertToRupees(totalExpenses)}.`);
  insights.push(`Available balance: ${convertToRupees(availableBalance)}. Savings rate: ${Number(savingsRate.toFixed(1))}%`);

  const topCats = Object.entries(categories)
    .sort((a, b) => (b[1].amount - a[1].amount))
    .slice(0, 3)
    .map(([name, c]) => `${name}: ${convertToRupees(c.amount)} (${c.percentage}%)`);

  if (topCats.length > 0) insights.push(`Top spending categories: ${topCats.join(", ")}`);
  else insights.push("No expense categories to show.");

  if (savingsRate < 10) insights.push("Suggestion: Your savings rate is low — consider reviewing discretionary spending.");
  else if (savingsRate < 25) insights.push("Suggestion: Decent savings — small tweaks could increase it further.");
  else insights.push("Great job — your savings rate looks healthy!");

  return insights;
}



function calculateSavingRate(totalIncome: number, totalExpenses: number) {
  if (totalIncome <= 0) return 0;
  const savingRate = ((totalIncome - totalExpenses) / totalIncome) * 100;
  return parseFloat(savingRate.toFixed(2));
}

