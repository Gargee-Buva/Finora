import { calculateNextReportDate } from "../../utils/helper.js";
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import ReportSettingModel from "../../models/report-setting-model.js";
import type { IUser } from "../../models/user.model.js"; 
import mongoose from "mongoose";
import { generateReportService } from "../../services/report.service.js";
import ReportModel, { ReportStatusEnum } from "../../models/report.model.js";
import { sendReportEmail } from "../../mailers/report.mailer.js";
import { formatCurrency } from "../../utils/format-currency.js";

export const processReportJob = async () => {
  const now = new Date();

  let processedCount = 0;
  let failedCount = 0;

  
//Get Last Month because this will run on the first of the month
  const from = startOfMonth(subMonths(now, 1));
  const to = endOfMonth(subMonths(now, 1));

  //const from = "2025-08-01T00:00:00.000 ";
  //const to = "2025-08-31T23:59:59.999";

  try {
    const reportSettingCursor = ReportSettingModel.find({
      isEnabled: true,
      nextReportDate: { $lte: now },
    })
     .populate<{ userId: IUser }>("userId")
     .cursor();

    console.log("Running report ");

    for await (const setting of reportSettingCursor) {
      const user = setting.userId as IUser;
        if (!user) {
        console.warn(`User not found for setting: ${setting._id} — userId stored: ${setting.userId}`);
        continue;
      }

      const session = await mongoose.startSession();

      try {
        const report = await generateReportService(user.id, from, to);

        if (report) {
  // JSON (exact object)
  console.log("\n=== report data (raw object) ===");
  console.log(JSON.stringify(report, null, 2));
  console.log("=== end report data ===\n");

  // Human-friendly formatted version similar to the tutorial
  try {
    console.log("Your MONTHLY Financial Report (" + report.period + ")");
    // Use formatCurrency helper which returns e.g. "₹18.98"
    const incomeStr = formatCurrency(Number(report.summary.income), "en-IN", "INR");
    const expensesStr = formatCurrency(Number(report.summary.expenses), "en-IN", "INR");
    const balanceStr = formatCurrency(Number(report.summary.balance), "en-IN", "INR");
    const savingsStr = `${Number(report.summary.savingsRate)}%`;

    console.log("Income: " + incomeStr);
    console.log("Expenses: " + expensesStr);
    console.log("Balance: " + balanceStr);
    console.log("Savings Rate: " + savingsStr);

    // Print insights if available
    if (Array.isArray(report.insights) && report.insights.length > 0) {
      console.log("\nInsights:");
      report.insights.forEach((ins: any, i: number) => {
        console.log(`${i + 1}. ${ins}`);
      });
    } else {
      console.log("\nNo insights available.");
    }
  } catch (err) {
    console.error("Error pretty-printing report:", err);
  }
} else {
  console.log("No report generated for user:", user.id);
}


        let emailSent = false;
        if (report) {
          try {
            await sendReportEmail({
              email: user.email!,
              username: user.name!,
              report: {
                period: report.period,
                totalIncome: report.summary.income,
                totalExpenses: report.summary.expenses,
                availableBalance: report.summary.balance,
                savingsRate: report.summary.savingsRate,
                topSpendingCategories: report.summary.topCategories,
                insights: report.insights,
              },
              frequency: setting.frequency!,
            });
            emailSent = true;
          } catch (error) {
            console.log(`Email failed for ${user.id}`);
          }
        }

        await session.withTransaction(
          async () => {
            const bulkReports: any[] = [];
            const bulkSettings: any[] = [];

            if (report && emailSent) {
              bulkReports.push({
                insertOne: {
                  document: {
                    userId: user.id,
                    sentDate: now,
                    period: report.period,
                    status: ReportStatusEnum.SENT,
                    createdAt: now,
                    updatedAt: now,
                  },
                },
              });

              bulkSettings.push({
                updateOne: {
                  filter: { _id: setting._id },
                  update: {
                    $set: {
                      lastSentDate: now,
                      nextReportDate: calculateNextReportDate(now),
                      updatedAt: now,
                    },
                  },
                },
              });
            } else {
              bulkReports.push({
                insertOne: {
                  document: {
                    userId: user.id,
                    sentDate: now,
                    period:
                      report?.period ||
                      `${format(from, "MMMM d")}–${format(to, "d, yyyy")}`,
                    status: report
                      ? ReportStatusEnum.FAILED
                      : ReportStatusEnum.NO_ACTIVITY,
                    createdAt: now,
                    updatedAt: now,
                  },
                },
              });

              bulkSettings.push({
                updateOne: {
                  filter: { _id: setting._id },
                  update: {
                    $set: {
                      lastSentDate: null,
                      nextReportDate: calculateNextReportDate(now),
                      updatedAt: now,
                    },
                  },
                },
              });
            }

          await Promise.all([
          ReportModel.bulkWrite(bulkReports, { ordered: false, session }),
          ReportSettingModel.bulkWrite(bulkSettings, { ordered: false, session }),
      ]);

          },
          {
            maxCommitTimeMS: 10000,
          }
        );

        processedCount++;
      } catch (error) {
        console.log(`Failed to process report`, error);
        failedCount++;
      } finally {
        await session.endSession();
      }
    }

    console.log(`✅Processed: ${processedCount} report`);
    console.log(`❌ Failed: ${failedCount} report`);

    return {
      success: true,
      processedCount,
      failedCount,
    };
  } catch (error) {
    console.error("Error processing reports", error);
    return {
      success: false,
      error: "Report process failed",
    };
  }
};


