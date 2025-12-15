import mongoose from "mongoose";
import TransactionModel from "../../models/transaction.model.js";

// Fallback/local implementation of calculateNextOccurrence to avoid relying on ../utils/helper.js
function calculateNextOccurrence(fromDate: Date, interval: any): Date {
  const next = new Date(fromDate);

  if (typeof interval === "number") {
    // treat numeric interval as days
    next.setDate(next.getDate() + interval);
    return next;
  }

  const norm = typeof interval === "string" ? interval.toLowerCase() : "";

  if (norm === "daily") {
    next.setDate(next.getDate() + 1);
  } else if (norm === "weekly") {
    next.setDate(next.getDate() + 7);
  } else if (norm === "monthly") {
    next.setMonth(next.getMonth() + 1);
  } else if (norm === "yearly" || norm === "annually") {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    // fallback: add one day
    next.setDate(next.getDate() + 1);
  }

  return next;
}
//previous
export const processRecurringTransactions = async () => {
  const now = new Date();
  let processedCount = 0;
  let failedCount = 0;

  try {
    const transactionCursor = TransactionModel.find({
      isRecurring: true,
      nextRecurrenceDate: { $lte: now },
    }).cursor();

    console.log("Starting recurring proccess");

    for await (const tx of transactionCursor) {
      const nextDate = calculateNextOccurrence(
        tx.nextRecurrenceDate!,
        tx.recurringInterval!
      );

      const session = await mongoose.startSession();
      try {
        await session.withTransaction(
          async () => {
            // console.log(tx, "transaction");
            await TransactionModel.create(
              [
                {
                  ...tx.toObject(),
                  _id: new mongoose.Types.ObjectId(),
                  title: `Recurring - ${tx.title}`,
                  date: tx.nextRecurrenceDate,
                  isRecurring: false,
                  nextRecurrenceDate: null,
                  recurringInterval: null,
                  lastProcessed: null,
                  createdAt: undefined,
                  updatedAt: undefined,
                },
              ],
              { session }
            );

            await TransactionModel.updateOne(
              { _id: tx._id },
              {
                $set: {
                  nextRecurrenceDate: nextDate,
                  lastProcessed: now,
                },
              },
              { session }
            );
          },
          {
            maxCommitTimeMS: 20000,
          }
        );

        processedCount++;
      } catch (error: any) {
        failedCount++;
        console.log(`Failed reccurring tx: ${tx._id}`, error);
      } finally {
        await session.endSession();
      }
    }

    console.log(`✅Processed: ${processedCount} transaction`);
    console.log(`❌ Failed: ${failedCount} transaction`);

    return {
      success: true,
      processedCount,
      failedCount,
    };
  } catch (error: any) {
    console.error("Error occur processing transaction", error);

    return {
      success: false,
      error: error?.message,
    };
  }
};