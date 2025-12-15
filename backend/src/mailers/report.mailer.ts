import { formatCurrency } from "../utils/format-currency.js";
import { getReportEmailTemplate } from "./templates/report.template.js";
import { sendEmail } from "./mailer.js"; 
import type { ReportType } from "../@types/report.type.js";

type ReportEmailParams = {
  email: string;
  username: string;
  report: ReportType;
  frequency: string;
};

export const sendReportEmail = async (params: ReportEmailParams) => {
  const { email, username, report, frequency } = params;

  const html = getReportEmailTemplate(
    {
      username,
      ...report,
    },
    frequency
  );

const text = `Your ${frequency} Financial Report (${report.period})
Income: ${formatCurrency(report.totalIncome)}
Expenses: ${formatCurrency(report.totalExpenses)}
Balance: ${formatCurrency(report.availableBalance)}
Savings Rate: ${report.savingsRate.toFixed(2)}%

${Array.isArray(report.insights) ? report.insights.join("\n") : ""}`;

  console.log("Mailer TEXT preview:\n", text);

  try {
    const result = await sendEmail({
      to: email,
      subject: `${frequency} Financial Report - ${report.period}`,
      html,
      text,
      // you can also pass from: '...'
    });

    console.log("sendReportEmail: mailer returned:", result);
    return result;
  } catch (err) {
    console.error("sendReportEmail: caught error from sendEmail:", err);
    throw err; // let caller handle marking emailSent false
  }
};

